#include "ChatModel.h"

#include <QUuid>
#include <QtCore/Qt>

namespace {
QString generateId()
{
  return QUuid::createUuid().toString(QUuid::WithoutBraces);
}
}

ChatModel::ChatModel(QObject* parent)
  : QAbstractListModel(parent)
{
}

int ChatModel::rowCount(const QModelIndex& parent) const
{
  if (parent.isValid()) {
    return 0;
  }
  return m_entries.size();
}

QVariant ChatModel::data(const QModelIndex& index, int role) const
{
  if (!index.isValid() || index.row() < 0 || index.row() >= m_entries.size()) {
    return {};
  }

  const Entry& entry = m_entries.at(index.row());
  switch (role) {
    case IdRole:
      return entry.id;
    case SenderRole:
      return entry.sender;
    case MessageRole:
      return entry.message;
    case StatusRole:
      return entry.status;
    case TimestampRole:
      return entry.timestamp;
    case TraceRole:
      return entry.trace;
    default:
      return {};
  }
}

QHash<int, QByteArray> ChatModel::roleNames() const
{
  return {
    { IdRole, "id" },
    { SenderRole, "sender" },
    { MessageRole, "message" },
    { StatusRole, "status" },
    { TimestampRole, "timestamp" },
    { TraceRole, "trace" },
  };
}

QString ChatModel::appendUserMessage(const QString& message)
{
  const int row = m_entries.size();
  beginInsertRows(QModelIndex(), row, row);
  m_entries.append(Entry{
    .id = generateId(),
    .sender = QStringLiteral("user"),
    .message = message,
    .status = QStringLiteral("sent"),
    .timestamp = QDateTime::currentDateTimeUtc(),
    .trace = {},
  });
  endInsertRows();
  return m_entries.last().id;
}

QString ChatModel::appendAssistantPlaceholder(const QString& title)
{
  const int row = m_entries.size();
  beginInsertRows(QModelIndex(), row, row);
  m_entries.append(Entry{
    .id = generateId(),
    .sender = QStringLiteral("assistant"),
    .message = title,
    .status = QStringLiteral("pending"),
    .timestamp = QDateTime::currentDateTimeUtc(),
    .trace = {},
  });
  endInsertRows();
  return m_entries.last().id;
}

void ChatModel::updateMessage(const QString& id, const QString& message)
{
  const int row = indexOfId(id);
  if (row < 0) {
    return;
  }

  Entry& entry = m_entries[row];
  entry.message = message;
  const QModelIndex modelIndex = index(row, 0);
  emit dataChanged(modelIndex, modelIndex, { MessageRole });
}

void ChatModel::updateStatus(const QString& id, const QString& status)
{
  const int row = indexOfId(id);
  if (row < 0) {
    return;
  }
  Entry& entry = m_entries[row];
  entry.status = status;
  const QModelIndex modelIndex = index(row, 0);
  emit dataChanged(modelIndex, modelIndex, { StatusRole });
}

void ChatModel::appendTraceStep(const QString& id, const QVariantMap& step)
{
  const int row = indexOfId(id);
  if (row < 0) {
    return;
  }
  Entry& entry = m_entries[row];
  entry.trace.append(step);
  const QModelIndex modelIndex = index(row, 0);
  emit dataChanged(modelIndex, modelIndex, { TraceRole });
}

void ChatModel::clear()
{
  if (m_entries.isEmpty()) {
    return;
  }
  beginResetModel();
  m_entries.clear();
  endResetModel();
}

QVector<QVariantMap> ChatModel::serialize() const
{
  QVector<QVariantMap> payload;
  payload.reserve(m_entries.size());
  for (const Entry& entry : m_entries) {
    QVariantMap record;
    record.insert(QStringLiteral("id"), entry.id);
    record.insert(QStringLiteral("sender"), entry.sender);
    record.insert(QStringLiteral("message"), entry.message);
    record.insert(QStringLiteral("status"), entry.status);
    record.insert(QStringLiteral("timestamp"), entry.timestamp.toString(Qt::ISODateWithMs));
    record.insert(QStringLiteral("trace"), entry.trace);
    payload.append(record);
  }
  return payload;
}

void ChatModel::hydrate(const QVector<QVariantMap>& payload)
{
  beginResetModel();
  m_entries.clear();
  for (const QVariantMap& record : payload) {
    Entry entry;
    entry.id = record.value(QStringLiteral("id"), generateId()).toString();
    entry.sender = record.value(QStringLiteral("sender")).toString();
    entry.message = record.value(QStringLiteral("message")).toString();
    entry.status = record.value(QStringLiteral("status"), QStringLiteral("done")).toString();
    entry.timestamp = QDateTime::fromString(record.value(QStringLiteral("timestamp")).toString(), Qt::ISODateWithMs);
    entry.trace = record.value(QStringLiteral("trace")).toList();
    if (!entry.timestamp.isValid()) {
      entry.timestamp = QDateTime::currentDateTimeUtc();
    }
    m_entries.append(entry);
  }
  endResetModel();
}

int ChatModel::indexOfId(const QString& id) const
{
  for (int row = 0; row < m_entries.size(); ++row) {
    if (m_entries.at(row).id == id) {
      return row;
    }
  }
  return -1;
}
