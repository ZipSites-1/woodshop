#pragma once

#include <QAbstractListModel>
#include <QDateTime>
#include <QVector>
#include <QVariantList>
#include <QVariantMap>

class ChatModel : public QAbstractListModel
{
  Q_OBJECT
public:
  enum Role {
    IdRole = Qt::UserRole + 1,
    SenderRole,
    MessageRole,
    StatusRole,
    TimestampRole,
    TraceRole
  };
  Q_ENUM(Role)

  explicit ChatModel(QObject* parent = nullptr);

  int rowCount(const QModelIndex& parent = QModelIndex()) const override;
  QVariant data(const QModelIndex& index, int role) const override;
  QHash<int, QByteArray> roleNames() const override;

  Q_INVOKABLE QString appendUserMessage(const QString& message);
  Q_INVOKABLE QString appendAssistantPlaceholder(const QString& title = QString());
  Q_INVOKABLE void updateMessage(const QString& id, const QString& message);
  Q_INVOKABLE void updateStatus(const QString& id, const QString& status);
  Q_INVOKABLE void appendTraceStep(const QString& id, const QVariantMap& step);
  Q_INVOKABLE void clear();

  [[nodiscard]] QVector<QVariantMap> serialize() const;
  void hydrate(const QVector<QVariantMap>& payload);

private:
  struct Entry {
    QString id;
    QString sender;
    QString message;
    QString status;
    QDateTime timestamp;
    QVariantList trace;
  };

  int indexOfId(const QString& id) const;

  QVector<Entry> m_entries;
};
