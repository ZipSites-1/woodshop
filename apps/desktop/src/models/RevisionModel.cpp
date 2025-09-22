#include "RevisionModel.h"

#include <QDateTime>
#include <QtCore/Qt>

RevisionModel::RevisionModel(QObject* parent)
  : QAbstractListModel(parent)
{
}

int RevisionModel::rowCount(const QModelIndex& parent) const
{
  if (parent.isValid()) {
    return 0;
  }
  return m_revisions.size();
}

QVariant RevisionModel::data(const QModelIndex& index, int role) const
{
  if (!index.isValid() || index.row() < 0 || index.row() >= m_revisions.size()) {
    return {};
  }

  const Revision& revision = m_revisions.at(index.row());
  switch (role) {
    case RevisionIdRole:
      return revision.id;
    case LabelRole:
      return revision.label;
    case TimestampRole:
      return revision.timestamp;
    case CurrentRole:
      return index.row() == m_currentIndex;
    default:
      return {};
  }
}

QHash<int, QByteArray> RevisionModel::roleNames() const
{
  return {
    { RevisionIdRole, "revisionId" },
    { LabelRole, "label" },
    { TimestampRole, "timestamp" },
    { CurrentRole, "current" },
  };
}

int RevisionModel::currentIndex() const
{
  return m_currentIndex;
}

QString RevisionModel::currentRevisionId() const
{
  if (m_currentIndex < 0 || m_currentIndex >= m_revisions.size()) {
    return {};
  }
  return m_revisions.at(m_currentIndex).id;
}

bool RevisionModel::canUndo() const
{
  return m_currentIndex > 0;
}

bool RevisionModel::canRedo() const
{
  return m_currentIndex >= 0 && m_currentIndex < m_revisions.size() - 1;
}

void RevisionModel::pushRevision(const QString& revisionId, const QString& label)
{
  const int row = m_revisions.size();
  beginInsertRows(QModelIndex(), row, row);
  m_revisions.append(Revision{
    .id = revisionId,
    .label = label,
    .timestamp = QDateTime::currentDateTimeUtc(),
  });
  endInsertRows();

  if (m_currentIndex != row) {
    const int previous = m_currentIndex;
    m_currentIndex = row;
    if (previous >= 0) {
      const QModelIndex oldIndex = index(previous, 0);
      emit dataChanged(oldIndex, oldIndex, { CurrentRole });
    }
  }
  emit currentRevisionChanged(revisionId);
  const QModelIndex newIndex = this->index(m_currentIndex, 0);
  emit dataChanged(newIndex, newIndex, { CurrentRole });
}

void RevisionModel::resetHistory()
{
  if (m_revisions.isEmpty()) {
    return;
  }

  beginResetModel();
  m_revisions.clear();
  m_currentIndex = -1;
  endResetModel();
}

void RevisionModel::undo()
{
  if (!canUndo()) {
    return;
  }
  const int previous = m_currentIndex;
  m_currentIndex -= 1;
  emit currentRevisionChanged(currentRevisionId());
  emit dataChanged(this->index(previous, 0), this->index(previous, 0), { CurrentRole });
  emit dataChanged(this->index(m_currentIndex, 0), this->index(m_currentIndex, 0), { CurrentRole });
}

void RevisionModel::redo()
{
  if (!canRedo()) {
    return;
  }
  const int previous = m_currentIndex;
  m_currentIndex += 1;
  emit currentRevisionChanged(currentRevisionId());
  emit dataChanged(this->index(previous, 0), this->index(previous, 0), { CurrentRole });
  emit dataChanged(this->index(m_currentIndex, 0), this->index(m_currentIndex, 0), { CurrentRole });
}

void RevisionModel::seek(int index)
{
  if (index < 0 || index >= m_revisions.size() || index == m_currentIndex) {
    return;
  }
  const int previous = m_currentIndex;
  m_currentIndex = index;
  emit currentRevisionChanged(currentRevisionId());
  if (previous >= 0) {
    emit dataChanged(this->index(previous, 0), this->index(previous, 0), { CurrentRole });
  }
  emit dataChanged(this->index(index, 0), this->index(index, 0), { CurrentRole });
}

QVector<QVariantMap> RevisionModel::serialize() const
{
  QVector<QVariantMap> records;
  records.reserve(m_revisions.size());
  for (int row = 0; row < m_revisions.size(); ++row) {
    const Revision& revision = m_revisions.at(row);
    QVariantMap map;
    map.insert(QStringLiteral("id"), revision.id);
    map.insert(QStringLiteral("label"), revision.label);
    map.insert(QStringLiteral("timestamp"), revision.timestamp.toString(Qt::ISODateWithMs));
    map.insert(QStringLiteral("current"), row == m_currentIndex);
    records.append(map);
  }
  return records;
}

void RevisionModel::hydrate(const QVector<QVariantMap>& snapshot)
{
  beginResetModel();
  m_revisions.clear();
  m_currentIndex = -1;
  int index = 0;
  for (const QVariantMap& map : snapshot) {
    Revision revision;
    revision.id = map.value(QStringLiteral("id")).toString();
    revision.label = map.value(QStringLiteral("label")).toString();
    revision.timestamp = QDateTime::fromString(map.value(QStringLiteral("timestamp")).toString(), Qt::ISODateWithMs);
    if (!revision.timestamp.isValid()) {
      revision.timestamp = QDateTime::currentDateTimeUtc();
    }
    m_revisions.append(revision);
    if (map.value(QStringLiteral("current")).toBool()) {
      m_currentIndex = index;
    }
    ++index;
  }
  endResetModel();
  if (m_currentIndex >= 0 && m_currentIndex < m_revisions.size()) {
    emit currentRevisionChanged(m_revisions.at(m_currentIndex).id);
  }
}
