#pragma once

#include <QAbstractListModel>
#include <QVector>
#include <QDateTime>

class RevisionModel : public QAbstractListModel
{
  Q_OBJECT
public:
  enum Role {
    RevisionIdRole = Qt::UserRole + 1,
    LabelRole,
    TimestampRole,
    CurrentRole
  };
  Q_ENUM(Role)

  explicit RevisionModel(QObject* parent = nullptr);

  int rowCount(const QModelIndex& parent = QModelIndex()) const override;
  QVariant data(const QModelIndex& index, int role) const override;
  QHash<int, QByteArray> roleNames() const override;

  Q_INVOKABLE int currentIndex() const;
  Q_INVOKABLE QString currentRevisionId() const;
  Q_INVOKABLE bool canUndo() const;
  Q_INVOKABLE bool canRedo() const;
  Q_INVOKABLE void pushRevision(const QString& revisionId, const QString& label);
  Q_INVOKABLE void undo();
  Q_INVOKABLE void redo();
  Q_INVOKABLE void resetHistory();
  Q_INVOKABLE void seek(int index);

  [[nodiscard]] QVector<QVariantMap> serialize() const;
  void hydrate(const QVector<QVariantMap>& snapshot);

signals:
  void currentRevisionChanged(const QString& revisionId);

private:
  struct Revision {
    QString id;
    QString label;
    QDateTime timestamp;
  };

  int m_currentIndex = -1;
  QVector<Revision> m_revisions;
};
