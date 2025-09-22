#include "ActionCardModel.h"

#include <QUuid>
#include <QtCore/Qt>

namespace {
QString generateId()
{
  return QUuid::createUuid().toString(QUuid::WithoutBraces);
}
}

ActionCardModel::ActionCardModel(QObject* parent)
  : QAbstractListModel(parent)
{
}

int ActionCardModel::rowCount(const QModelIndex& parent) const
{
  if (parent.isValid()) {
    return 0;
  }
  return m_entries.size();
}

QVariant ActionCardModel::data(const QModelIndex& index, int role) const
{
  if (!index.isValid() || index.row() < 0 || index.row() >= m_entries.size()) {
    return {};
  }

  const Entry& entry = m_entries.at(index.row());
  switch (role) {
    case IdentifierRole:
      return entry.identifier;
    case TitleRole:
      return entry.title;
    case StatusRole:
      return entry.status;
    case DurationRole:
      return entry.durationMs;
    case LinksRole:
      return entry.links;
    case InputRole:
      return entry.input;
    case OutputRole:
      return entry.output;
    case ErrorRole:
      return entry.error;
    case TimestampRole:
      return entry.timestamp;
    default:
      return {};
  }
}

QHash<int, QByteArray> ActionCardModel::roleNames() const
{
  return {
    { IdentifierRole, "identifier" },
    { TitleRole, "title" },
    { StatusRole, "status" },
    { DurationRole, "durationMs" },
    { LinksRole, "links" },
    { InputRole, "input" },
    { OutputRole, "output" },
    { ErrorRole, "error" },
    { TimestampRole, "timestamp" },
  };
}

QString ActionCardModel::appendInFlight(const QString& title, const QVariantMap& input)
{
  const int row = m_entries.size();
  beginInsertRows(QModelIndex(), row, row);
  const QString identifier = generateId();
  m_entries.append(Entry{
    .identifier = identifier,
    .title = title,
    .status = QStringLiteral("running"),
    .durationMs = 0.0,
    .links = {},
    .input = input,
    .output = {},
    .error = {},
    .timestamp = QDateTime::currentDateTimeUtc(),
  });
  endInsertRows();
  return identifier;
}

void ActionCardModel::markCompleted(const QString& identifier, const QVariantMap& output, double durationMs, const QStringList& links)
{
  const int row = indexOf(identifier);
  if (row < 0) {
    return;
  }
  Entry& entry = m_entries[row];
  entry.status = QStringLiteral("done");
  entry.durationMs = durationMs;
  entry.output = output;
  entry.links = links;
  entry.error.clear();
  entry.timestamp = QDateTime::currentDateTimeUtc();
  const QModelIndex idx = index(row, 0);
  emit dataChanged(idx, idx, { StatusRole, DurationRole, OutputRole, LinksRole, ErrorRole, TimestampRole });
}

void ActionCardModel::markFailed(const QString& identifier, const QString& errorMessage)
{
  const int row = indexOf(identifier);
  if (row < 0) {
    return;
  }
  Entry& entry = m_entries[row];
  entry.status = QStringLiteral("error");
  entry.error = errorMessage;
  entry.timestamp = QDateTime::currentDateTimeUtc();
  const QModelIndex idx = index(row, 0);
  emit dataChanged(idx, idx, { StatusRole, ErrorRole, TimestampRole });
}

QVector<QVariantMap> ActionCardModel::serialize() const
{
  QVector<QVariantMap> records;
  records.reserve(m_entries.size());
  for (const Entry& entry : m_entries) {
    QVariantMap map;
    map.insert(QStringLiteral("identifier"), entry.identifier);
    map.insert(QStringLiteral("title"), entry.title);
    map.insert(QStringLiteral("status"), entry.status);
    map.insert(QStringLiteral("durationMs"), entry.durationMs);
    map.insert(QStringLiteral("links"), entry.links);
    map.insert(QStringLiteral("input"), entry.input);
    map.insert(QStringLiteral("output"), entry.output);
    map.insert(QStringLiteral("error"), entry.error);
    map.insert(QStringLiteral("timestamp"), entry.timestamp.toString(Qt::ISODateWithMs));
    records.append(map);
  }
  return records;
}

void ActionCardModel::hydrate(const QVector<QVariantMap>& records)
{
  beginResetModel();
  m_entries.clear();
  for (const QVariantMap& map : records) {
    Entry entry;
    entry.identifier = map.value(QStringLiteral("identifier"), generateId()).toString();
    entry.title = map.value(QStringLiteral("title")).toString();
    entry.status = map.value(QStringLiteral("status"), QStringLiteral("done")).toString();
    entry.durationMs = map.value(QStringLiteral("durationMs"), 0.0).toDouble();
    entry.links = map.value(QStringLiteral("links")).toStringList();
    entry.input = map.value(QStringLiteral("input")).toMap();
    entry.output = map.value(QStringLiteral("output")).toMap();
    entry.error = map.value(QStringLiteral("error")).toString();
    entry.timestamp = QDateTime::fromString(map.value(QStringLiteral("timestamp")).toString(), Qt::ISODateWithMs);
    if (!entry.timestamp.isValid()) {
      entry.timestamp = QDateTime::currentDateTimeUtc();
    }
    m_entries.append(entry);
  }
  endResetModel();
}

int ActionCardModel::indexOf(const QString& identifier) const
{
  for (int row = 0; row < m_entries.size(); ++row) {
    if (m_entries.at(row).identifier == identifier) {
      return row;
    }
  }
  return -1;
}
