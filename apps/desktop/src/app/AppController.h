#pragma once

#include <QObject>
#include <QHash>
#include <QList>
#include <QVariantMap>

#include "models/ActionCardModel.h"
#include "models/ChatModel.h"
#include "models/RevisionModel.h"
#include "services/McpSession.h"
#include "services/OfflineCache.h"
#include "services/OcctViewerBridge.h"
#include "services/ConsentState.h"

class AppController : public QObject
{
  Q_OBJECT
  Q_PROPERTY(ChatModel* chatModel READ chatModel CONSTANT)
  Q_PROPERTY(ActionCardModel* actionCardModel READ actionCardModel CONSTANT)
  Q_PROPERTY(RevisionModel* revisionModel READ revisionModel CONSTANT)
  Q_PROPERTY(OfflineCache* offlineCache READ offlineCache CONSTANT)
  Q_PROPERTY(McpSession* mcpSession READ mcpSession CONSTANT)
  Q_PROPERTY(OcctViewerBridge* viewerBridge READ viewerBridge CONSTANT)
  Q_PROPERTY(bool consentPromptVisible READ consentPromptVisible NOTIFY consentPromptVisibleChanged)
  Q_PROPERTY(QString consentPromptTool READ consentPromptTool NOTIFY consentPromptToolChanged)

public:
  explicit AppController(QObject* parent = nullptr);
  ~AppController() override;

  void initialize();

  Q_INVOKABLE void sendChatMessage(const QString& message);
  Q_INVOKABLE QString runTool(const QString& toolName, const QVariantMap& input, const QString& messageId = QString());
  Q_INVOKABLE void confirmConsent();
  Q_INVOKABLE void cancelConsent();
  Q_INVOKABLE void undo();
  Q_INVOKABLE void redo();
  Q_INVOKABLE void gotoRevision(int index);
  Q_INVOKABLE void refreshConnection();

  ChatModel* chatModel();
  ActionCardModel* actionCardModel();
  RevisionModel* revisionModel();
  OfflineCache* offlineCache();
  McpSession* mcpSession();
  OcctViewerBridge* viewerBridge();
  [[nodiscard]] bool consentPromptVisible() const;
  [[nodiscard]] QString consentPromptTool() const;

signals:
  void initialized();
  void consentPromptVisibleChanged();
  void consentPromptToolChanged();

private:
  void connectSignals();
  void hydrateFromCache();
  void persistState();
  void persistQueue();
  void enqueueCall(const QVariantMap& payload);
  void flushQueue();
  [[nodiscard]] bool requiresConsent(const QString& toolName) const;
  QString handleConsentProtectedCall(const QString& toolName, const QVariantMap& input, const QString& messageId);
  QString dispatchToolCall(const QString& toolName, const QVariantMap& input, const QString& messageId);
  void resetConsentState();

  ChatModel m_chatModel;
  ActionCardModel m_actionCardModel;
  RevisionModel m_revisionModel;
  OfflineCache m_offlineCache;
  McpSession m_mcpSession;
  OcctViewerBridge m_viewerBridge;
  ConsentState m_consent;

  QList<QVariantMap> m_queuedCalls;
  QHash<QString, QString> m_requestToCard;
  QHash<QString, QString> m_requestToMessage;
};
