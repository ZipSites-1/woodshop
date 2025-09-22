#pragma once

#include <QObject>
#include <QVariantMap>
#include <QVariantList>
#include <QElapsedTimer>

class McpSession : public QObject
{
  Q_OBJECT
  Q_PROPERTY(bool connected READ isConnected NOTIFY connectedChanged)
  Q_PROPERTY(bool replayMode READ isReplayMode NOTIFY replayModeChanged)
  Q_PROPERTY(bool busy READ isBusy NOTIFY busyChanged)

public:
  explicit McpSession(QObject* parent = nullptr);

  void bootstrap();

  [[nodiscard]] bool isConnected() const;
  [[nodiscard]] bool isReplayMode() const;
  [[nodiscard]] bool isBusy() const;

  QString requestTool(const QString& toolName, const QVariantMap& input);
  void setReplayResponses(const QList<QVariantMap>& responses);

signals:
  void connectedChanged();
  void replayModeChanged();
  void busyChanged();
  void toolCallStarted(const QString& requestId, const QString& toolName, const QVariantMap& input);
  void toolCallFinished(const QString& requestId, const QVariantMap& output, const QVariantMap& metadata);
  void toolCallFailed(const QString& requestId, const QString& errorMessage);
  void assistantMessageReady(const QString& requestId, const QString& message, const QVariantList& trace);

private:
  struct PendingCall {
    QString requestId;
    QString toolName;
    QVariantMap input;
    QElapsedTimer timer;
  };

  void fulfillPending(const PendingCall& call);
  QVariantMap simulateToolOutput(const QString& toolName, const QVariantMap& input) const;
  QVariantList buildTrace(const QString& toolName, const QVariantMap& input, const QVariantMap& output) const;

  bool m_connected = false;
  bool m_replayMode = true;
  QList<PendingCall> m_activeCalls;
  QList<QVariantMap> m_replayResponses;
};
