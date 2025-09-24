#include "AppController.h"

#include <QDateTime>
#include <QElapsedTimer>
#include <QTimer>
#include <QtCore/Qt>
#include <QUuid>
#include <QSet>

#include <utility>

namespace {
constexpr auto KEY_TOOL = "$tool";
constexpr auto KEY_MESSAGE = "$messageId";
constexpr auto KEY_QUEUED_AT = "$queuedAt";

struct ToolPlan {
  QString tool;
  QVariantMap input;
  QString heading;
};

ToolPlan planForPrompt(const QString& message)
{
  const QString lowered = message.toLower();
  ToolPlan plan;
  plan.input.insert(QStringLiteral("project_id"), QStringLiteral("demo_credenza"));

  if (lowered.contains(QStringLiteral("gcode")) || lowered.contains(QStringLiteral("postprocess"))) {
    plan.tool = QStringLiteral("postprocess_grbl");
    plan.heading = QStringLiteral("Postprocessing toolpaths to GRBL");
    QVariantMap program;
    program.insert(QStringLiteral("program_id"), QStringLiteral("seed_demo"));
    program.insert(QStringLiteral("total_runtime_sec"), 420.0);
    program.insert(QStringLiteral("total_length_mm"), 12345.0);
    QVariantList toolpaths;
    QVariantMap toolpath; toolpath.insert(QStringLiteral("toolpath_id"), QStringLiteral("tp_demo"));
    toolpath.insert(QStringLiteral("operation_type"), QStringLiteral("contour"));
    toolpath.insert(QStringLiteral("operation_label"), QStringLiteral("Contour"));
    toolpath.insert(QStringLiteral("length_mm"), 5000.0);
    toolpath.insert(QStringLiteral("estimated_runtime_sec"), 210.0);
    toolpath.insert(QStringLiteral("segments"), QVariantList());
    toolpaths.append(toolpath);
    program.insert(QStringLiteral("toolpaths"), toolpaths);
    plan.input.insert(QStringLiteral("controller"), QStringLiteral("grbl"));
    plan.input.insert(QStringLiteral("confirm_write"), true);
    plan.input.insert(QStringLiteral("program"), program);
  } else if (lowered.contains(QStringLiteral("drawing")) || lowered.contains(QStringLiteral("sheet"))) {
    plan.tool = QStringLiteral("make_drawing");
    plan.heading = QStringLiteral("Generating drawing sheet");
    plan.input.insert(QStringLiteral("format"), QStringLiteral("A3"));
    plan.input.insert(QStringLiteral("views"), QVariantList{ QStringLiteral("isometric"), QStringLiteral("front") });
  } else {
    plan.tool = QStringLiteral("generate_toolpaths");
    plan.heading = QStringLiteral("Generating toolpaths");
    plan.input.insert(QStringLiteral("stock"), QVariantMap{
      { QStringLiteral("length_mm"), 1800 },
      { QStringLiteral("width_mm"), 600 },
      { QStringLiteral("thickness_mm"), 18 },
    });
    plan.input.insert(QStringLiteral("operations"), QVariantList{
      QVariantMap{{ QStringLiteral("type"), QStringLiteral("contour") }, { QStringLiteral("name"), QStringLiteral("Perimeter") }},
    });
  }
  return plan;
}
}

AppController::AppController(QObject* parent)
  : QObject(parent)
  , m_chatModel(this)
  , m_actionCardModel(this)
  , m_revisionModel(this)
  , m_offlineCache(this)
  , m_mcpSession(this)
  , m_viewerBridge(this)
{
  connectSignals();
}

AppController::~AppController() = default;

void AppController::initialize()
{
  QElapsedTimer timer;
  timer.start();

  m_offlineCache.initialize();
  hydrateFromCache();

  m_viewerBridge.prepare();
  m_mcpSession.bootstrap();

  emit initialized();

  Q_UNUSED(timer);
}

void AppController::sendChatMessage(const QString& message)
{
  const QString trimmed = message.trimmed();
  if (trimmed.isEmpty()) {
    return;
  }

  const QString userId = m_chatModel.appendUserMessage(trimmed);
  Q_UNUSED(userId);

  const ToolPlan plan = planForPrompt(trimmed);
  const QString assistantId = m_chatModel.appendAssistantPlaceholder(plan.heading);
  m_chatModel.updateStatus(assistantId, m_mcpSession.isConnected() ? QStringLiteral("pending") : QStringLiteral("queued"));

  QVariantMap input = plan.input;
  const QString requestId = runTool(plan.tool, input, assistantId);
  if (!requestId.isEmpty()) {
    m_requestToMessage.insert(requestId, assistantId);
  }

  persistState();
}

QString AppController::runTool(const QString& toolName, const QVariantMap& input, const QString& messageId)
{
  if (requiresConsent(toolName)) {
    return handleConsentProtectedCall(toolName, input, messageId);
  }
  return dispatchToolCall(toolName, input, messageId);
}

void AppController::undo()
{
  m_revisionModel.undo();
}

void AppController::redo()
{
  m_revisionModel.redo();
}

void AppController::gotoRevision(int index)
{
  m_revisionModel.seek(index);
}

void AppController::refreshConnection()
{
  m_mcpSession.bootstrap();
}

ChatModel* AppController::chatModel()
{
  return &m_chatModel;
}

ActionCardModel* AppController::actionCardModel()
{
  return &m_actionCardModel;
}

RevisionModel* AppController::revisionModel()
{
  return &m_revisionModel;
}

OfflineCache* AppController::offlineCache()
{
  return &m_offlineCache;
}

McpSession* AppController::mcpSession()
{
  return &m_mcpSession;
}

OcctViewerBridge* AppController::viewerBridge()
{
  return &m_viewerBridge;
}

void AppController::connectSignals()
{
  connect(&m_mcpSession, &McpSession::toolCallStarted, this, [this](const QString& requestId, const QString& toolName, const QVariantMap& input) {
    const QString cardId = m_actionCardModel.appendInFlight(toolName, input);
    m_requestToCard.insert(requestId, cardId);
    const QString messageId = m_requestToMessage.value(requestId);
    if (!messageId.isEmpty()) {
      m_chatModel.updateStatus(messageId, QStringLiteral("running"));
    }
    persistState();
  });

  connect(&m_mcpSession, &McpSession::toolCallFinished, this, [this](const QString& requestId, const QVariantMap& output, const QVariantMap& metadata) {
    const QString cardId = m_requestToCard.take(requestId);
    QStringList links;
    const QString artifact = output.value(QStringLiteral("artifact")).toString();
    if (!artifact.isEmpty()) {
      links << artifact;
      m_viewerBridge.loadArtifact(artifact);
    }
    if (!cardId.isEmpty()) {
      m_actionCardModel.markCompleted(cardId, output, metadata.value(QStringLiteral("durationMs")).toDouble(), links);
    }

    const QString messageId = m_requestToMessage.take(requestId);
    if (!messageId.isEmpty()) {
      if (output.contains(QStringLiteral("summary"))) {
        m_chatModel.updateMessage(messageId, output.value(QStringLiteral("summary")).toString());
      }
      m_chatModel.updateStatus(messageId, QStringLiteral("done"));
    }

    const QString revisionLabel = metadata.value(QStringLiteral("tool")).toString();
    const QString revisionId = QStringLiteral("%1-%2").arg(revisionLabel, QDateTime::currentDateTimeUtc().toString(QStringLiteral("yyyyMMddHHmmss")));
    m_revisionModel.pushRevision(revisionId, revisionLabel);

    persistState();
  });

  connect(&m_mcpSession, &McpSession::toolCallFailed, this, [this](const QString& requestId, const QString& errorMessage) {
    const QString cardId = m_requestToCard.take(requestId);
    if (!cardId.isEmpty()) {
      m_actionCardModel.markFailed(cardId, errorMessage);
    }

    const QString messageId = m_requestToMessage.take(requestId);
    if (!messageId.isEmpty()) {
      m_chatModel.updateStatus(messageId, QStringLiteral("error"));
      m_chatModel.updateMessage(messageId, errorMessage);
    }

    persistState();
  });

  connect(&m_mcpSession, &McpSession::assistantMessageReady, this, [this](const QString& requestId, const QString& message, const QVariantList& trace) {
    const QString messageId = m_requestToMessage.value(requestId);
    if (messageId.isEmpty()) {
      return;
    }
    if (!message.isEmpty()) {
      m_chatModel.updateMessage(messageId, message);
    }
    for (const QVariant& item : trace) {
      m_chatModel.appendTraceStep(messageId, item.toMap());
    }
    persistState();
  });

  connect(&m_mcpSession, &McpSession::connectedChanged, this, [this]() {
    if (m_mcpSession.isConnected()) {
      flushQueue();
    }
  });
}

void AppController::hydrateFromCache()
{
  m_chatModel.hydrate(m_offlineCache.loadConversation());
  m_actionCardModel.hydrate(m_offlineCache.loadActionCards());
  m_revisionModel.hydrate(m_offlineCache.loadRevisions());
  m_queuedCalls = m_offlineCache.loadQueuedCalls();

  for (const QVariantMap& payload : std::as_const(m_queuedCalls)) {
    const QString messageId = payload.value(KEY_MESSAGE).toString();
    if (!messageId.isEmpty()) {
      m_chatModel.updateStatus(messageId, QStringLiteral("queued"));
    }
  }
}

void AppController::persistState()
{
  if (!m_offlineCache.isReady()) {
    return;
  }
  m_offlineCache.saveConversation(m_chatModel.serialize());
  m_offlineCache.saveActionCards(m_actionCardModel.serialize());
  m_offlineCache.saveRevisions(m_revisionModel.serialize());
  persistQueue();
}

void AppController::persistQueue()
{
  if (!m_offlineCache.isReady()) {
    return;
  }
  m_offlineCache.saveQueuedCalls(m_queuedCalls);
}

void AppController::enqueueCall(const QVariantMap& payload)
{
  m_queuedCalls.append(payload);
  persistQueue();
}

void AppController::flushQueue()
{
  if (!m_mcpSession.isConnected() || m_queuedCalls.isEmpty()) {
    return;
  }

  const QList<QVariantMap> pending = m_queuedCalls;
  m_queuedCalls.clear();
  persistQueue();

  for (const QVariantMap& payload : pending) {
    const QString toolName = payload.value(KEY_TOOL).toString();
    QVariantMap input = payload;
    input.remove(KEY_TOOL);
    const QString messageId = input.take(KEY_MESSAGE).toString();
    input.remove(KEY_QUEUED_AT);
    const QString requestId = runTool(toolName, input, messageId);
    if (!requestId.isEmpty() && !messageId.isEmpty()) {
      m_requestToMessage.insert(requestId, messageId);
    }
  }
}

bool AppController::requiresConsent(const QString& toolName) const
{
  static const QSet<QString> consentTools = {
    QStringLiteral("export_artifacts"),
    QStringLiteral("postprocess_grbl"),
  };
  return consentTools.contains(toolName);
}

QString AppController::handleConsentProtectedCall(const QString& toolName, const QVariantMap& input, const QString& messageId)
{
  if (input.contains(QStringLiteral("consent_token"))) {
    return dispatchToolCall(toolName, input, messageId);
  }

  if (m_consent.pending) {
    if (!m_consent.pendingMessageId.isEmpty() && m_consent.pendingMessageId != messageId) {
      m_chatModel.updateStatus(m_consent.pendingMessageId, QStringLiteral("cancelled"));
    }
  }

  m_consent.pending = true;
  m_consent.toolName = toolName;
  m_consent.pendingInput = input;
  m_consent.pendingMessageId = messageId;

  if (!messageId.isEmpty()) {
    m_chatModel.updateStatus(messageId, QStringLiteral("needs-consent"));
  }

  emit consentPromptToolChanged();
  emit consentPromptVisibleChanged();
  return {};
}

QString AppController::dispatchToolCall(const QString& toolName, const QVariantMap& input, const QString& messageId)
{
  if (!m_mcpSession.isConnected()) {
    QVariantMap payload = input;
    payload.insert(KEY_TOOL, toolName);
    if (!messageId.isEmpty()) {
      payload.insert(KEY_MESSAGE, messageId);
      m_chatModel.updateStatus(messageId, QStringLiteral("queued"));
    }
    payload.insert(KEY_QUEUED_AT, QDateTime::currentDateTimeUtc().toString(Qt::ISODateWithMs));
    enqueueCall(payload);
    return {};
  }

  const QString requestId = m_mcpSession.requestTool(toolName, input);
  if (!messageId.isEmpty()) {
    m_requestToMessage.insert(requestId, messageId);
  }
  return requestId;
}

void AppController::resetConsentState()
{
  const bool wasPending = m_consent.pending;
  const bool hadTool = m_consent.toolName.has_value();
  m_consent.clear();
  if (hadTool) {
    emit consentPromptToolChanged();
  }
  if (wasPending) {
    emit consentPromptVisibleChanged();
  }
}

bool AppController::consentPromptVisible() const
{
  return m_consent.pending;
}

QString AppController::consentPromptTool() const
{
  return m_consent.toolName.value_or(QString());
}

void AppController::confirmConsent()
{
  if (!m_consent.pending || !m_consent.toolName.has_value()) {
    return;
  }

  QVariantMap payload = m_consent.pendingInput;
  const QString tool = m_consent.toolName.value();
  const QString messageId = m_consent.pendingMessageId;

  const QString token = QUuid::createUuid().toString(QUuid::WithoutBraces);
  payload.insert(QStringLiteral("consent_token"), token);

  resetConsentState();

  const bool wasConnected = m_mcpSession.isConnected();
  if (!messageId.isEmpty()) {
    m_chatModel.updateStatus(messageId, wasConnected ? QStringLiteral("pending") : QStringLiteral("queued"));
  }

  dispatchToolCall(tool, payload, messageId);
  persistState();
}

void AppController::cancelConsent()
{
  if (!m_consent.pending) {
    return;
  }

  if (!m_consent.pendingMessageId.isEmpty()) {
    m_chatModel.updateStatus(m_consent.pendingMessageId, QStringLiteral("cancelled"));
  }

  resetConsentState();
  persistState();
}
