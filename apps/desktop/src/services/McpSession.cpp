#include "McpSession.h"

#include <QDateTime>
#include <QRandomGenerator>
#include <QTimer>
#include <QUuid>
#include <QtCore/Qt>

#include <algorithm>

namespace {
QString generateRequestId()
{
  return QUuid::createUuid().toString(QUuid::WithoutBraces);
}
}

McpSession::McpSession(QObject* parent)
  : QObject(parent)
{
}

void McpSession::bootstrap()
{
  // Placeholder handshake; future implementation will negotiate with the MCP server.
  QTimer::singleShot(0, this, [this]() {
    if (!m_connected) {
      m_connected = true;
      emit connectedChanged();
    }
    if (m_replayMode) {
      m_replayMode = false;
      emit replayModeChanged();
    }
  });
}

bool McpSession::isConnected() const
{
  return m_connected;
}

bool McpSession::isReplayMode() const
{
  return m_replayMode;
}

bool McpSession::isBusy() const
{
  return !m_activeCalls.isEmpty();
}

QString McpSession::requestTool(const QString& toolName, const QVariantMap& input)
{
  PendingCall call;
  call.requestId = generateRequestId();
  call.toolName = toolName;
  call.input = input;
  call.timer.start();

  m_activeCalls.append(call);
  emit busyChanged();
  emit toolCallStarted(call.requestId, call.toolName, call.input);

  const int simulatedDelay = 200 + QRandomGenerator::global()->bounded(500);
  QTimer::singleShot(simulatedDelay, this, [this, call]() {
    fulfillPending(call);
  });

  return call.requestId;
}

void McpSession::setReplayResponses(const QList<QVariantMap>& responses)
{
  m_replayResponses = responses;
  m_replayMode = true;
  emit replayModeChanged();
}

void McpSession::fulfillPending(const PendingCall& call)
{
  auto it = std::find_if(m_activeCalls.begin(), m_activeCalls.end(), [&](const PendingCall& pending) {
    return pending.requestId == call.requestId;
  });
  if (it == m_activeCalls.end()) {
    return;
  }

  const qint64 durationMs = it->timer.elapsed();
  m_activeCalls.erase(it);
  emit busyChanged();

  QVariantMap output;
  QVariantMap metadata;

  if (!m_replayResponses.isEmpty()) {
    output = m_replayResponses.takeFirst();
    if (output.contains(QStringLiteral("error"))) {
      emit toolCallFailed(call.requestId, output.value(QStringLiteral("error")).toString());
      return;
    }
  } else {
    output = simulateToolOutput(call.toolName, call.input);
    if (output.contains(QStringLiteral("error"))) {
      emit toolCallFailed(call.requestId, output.value(QStringLiteral("error")).toString());
      return;
    }
  }

  metadata.insert(QStringLiteral("durationMs"), static_cast<double>(durationMs));
  metadata.insert(QStringLiteral("tool"), call.toolName);

  emit toolCallFinished(call.requestId, output, metadata);

  const QVariantList trace = buildTrace(call.toolName, call.input, output);
  if (!trace.isEmpty()) {
    emit assistantMessageReady(call.requestId, output.value(QStringLiteral("summary")).toString(), trace);
  }
}

QVariantMap McpSession::simulateToolOutput(const QString& toolName, const QVariantMap& input) const
{
  QVariantMap output;
  if (toolName == QStringLiteral("generate_toolpaths")) {
    output.insert(QStringLiteral("summary"), QStringLiteral("Generated toolpaths for %1 operations.").arg(input.value(QStringLiteral("operations")).toList().size()));
    output.insert(QStringLiteral("artifact"), QStringLiteral("artifacts/toolpaths/%1.json").arg(input.value(QStringLiteral("project_id")).toString()));
  } else if (toolName == QStringLiteral("postprocess_grbl")) {
    output.insert(QStringLiteral("summary"), QStringLiteral("Postprocessed GRBL program %1").arg(input.value(QStringLiteral("project_id")).toString()));
    output.insert(QStringLiteral("artifact"), QStringLiteral("artifacts/gcode/%1.nc").arg(input.value(QStringLiteral("project_id")).toString()));
  } else if (toolName == QStringLiteral("make_drawing")) {
    output.insert(QStringLiteral("summary"), QStringLiteral("Created drawing sheet for %1").arg(input.value(QStringLiteral("project_id")).toString()));
    output.insert(QStringLiteral("artifact"), QStringLiteral("artifacts/drawings/%1.pdf").arg(input.value(QStringLiteral("project_id")).toString()));
  } else {
    output.insert(QStringLiteral("summary"), QStringLiteral("Executed tool %1").arg(toolName));
  }

  output.insert(QStringLiteral("timestamp"), QDateTime::currentDateTimeUtc().toString(Qt::ISODateWithMs));
  return output;
}

QVariantList McpSession::buildTrace(const QString& toolName, const QVariantMap& input, const QVariantMap& output) const
{
  QVariantList trace;
  QVariantMap step1;
  step1.insert(QStringLiteral("type"), QStringLiteral("tool_call"));
  step1.insert(QStringLiteral("tool"), toolName);
  step1.insert(QStringLiteral("input"), input);
  trace.append(step1);

  QVariantMap step2;
  step2.insert(QStringLiteral("type"), QStringLiteral("tool_result"));
  step2.insert(QStringLiteral("output"), output);
  trace.append(step2);
  return trace;
}
