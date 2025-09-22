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

class AppController : public QObject
{
  Q_OBJECT
  Q_PROPERTY(ChatModel* chatModel READ chatModel CONSTANT)
  Q_PROPERTY(ActionCardModel* actionCardModel READ actionCardModel CONSTANT)
  Q_PROPERTY(RevisionModel* revisionModel READ revisionModel CONSTANT)
  Q_PROPERTY(OfflineCache* offlineCache READ offlineCache CONSTANT)
  Q_PROPERTY(McpSession* mcpSession READ mcpSession CONSTANT)
  Q_PROPERTY(OcctViewerBridge* viewerBridge READ viewerBridge CONSTANT)

public:
  explicit AppController(QObject* parent = nullptr);
  ~AppController() override;

  void initialize();

  Q_INVOKABLE void sendChatMessage(const QString& message);
  Q_INVOKABLE QString runTool(const QString& toolName, const QVariantMap& input, const QString& messageId = QString());
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

signals:
  void initialized();

private:
  void connectSignals();
  void hydrateFromCache();
  void persistState();
  void persistQueue();
  void enqueueCall(const QVariantMap& payload);
  void flushQueue();

  ChatModel m_chatModel;
  ActionCardModel m_actionCardModel;
  RevisionModel m_revisionModel;
  OfflineCache m_offlineCache;
  McpSession m_mcpSession;
  OcctViewerBridge m_viewerBridge;

  QList<QVariantMap> m_queuedCalls;
  QHash<QString, QString> m_requestToCard;
  QHash<QString, QString> m_requestToMessage;
};
