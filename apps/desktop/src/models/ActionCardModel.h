#pragma once

#include <QAbstractListModel>
#include <QVector>
#include <QStringList>
#include <QDateTime>
#include <QVariantMap>

class ActionCardModel : public QAbstractListModel
{
  Q_OBJECT
public:
  enum Role {
    IdentifierRole = Qt::UserRole + 1,
    TitleRole,
    StatusRole,
    DurationRole,
    LinksRole,
    InputRole,
    OutputRole,
    ErrorRole,
    TimestampRole
  };
  Q_ENUM(Role)

  explicit ActionCardModel(QObject* parent = nullptr);

  int rowCount(const QModelIndex& parent = QModelIndex()) const override;
  QVariant data(const QModelIndex& index, int role) const override;
  QHash<int, QByteArray> roleNames() const override;

  Q_INVOKABLE QString appendInFlight(const QString& title, const QVariantMap& input);
  Q_INVOKABLE void markCompleted(const QString& identifier, const QVariantMap& output, double durationMs, const QStringList& links = {});
  Q_INVOKABLE void markFailed(const QString& identifier, const QString& errorMessage);

  [[nodiscard]] QVector<QVariantMap> serialize() const;
  void hydrate(const QVector<QVariantMap>& records);

private:
  struct Entry {
    QString identifier;
    QString title;
    QString status;
    double durationMs = 0.0;
    QStringList links;
    QVariantMap input;
    QVariantMap output;
    QString error;
    QDateTime timestamp;
  };

  int indexOf(const QString& identifier) const;

  QVector<Entry> m_entries;
};
