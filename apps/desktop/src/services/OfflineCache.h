#pragma once

#include <QObject>
#include <QString>
#include <QVariantMap>
#include <QVector>
#include <QList>
#include <QJsonDocument>

class OfflineCache : public QObject
{
  Q_OBJECT
  Q_PROPERTY(QString rootPath READ rootPath NOTIFY rootPathChanged)
  Q_PROPERTY(bool ready READ isReady NOTIFY readyChanged)

public:
  explicit OfflineCache(QObject* parent = nullptr);

  void initialize();

  [[nodiscard]] QString rootPath() const;
  [[nodiscard]] bool isReady() const;

  QVector<QVariantMap> loadConversation() const;
  QVector<QVariantMap> loadActionCards() const;
  QVector<QVariantMap> loadRevisions() const;
  QList<QVariantMap> loadQueuedCalls() const;

  void saveConversation(const QVector<QVariantMap>& entries);
  void saveActionCards(const QVector<QVariantMap>& cards);
  void saveRevisions(const QVector<QVariantMap>& revisions);
  void saveQueuedCalls(const QList<QVariantMap>& queuedCalls);

signals:
  void rootPathChanged();
  void readyChanged();

private:
  [[nodiscard]] QString conversationsPath() const;
  [[nodiscard]] QString actionCardsPath() const;
  [[nodiscard]] QString revisionsPath() const;
  [[nodiscard]] QString queuePath() const;
  [[nodiscard]] QString artifactsPath() const;

  static bool writeJson(const QString& path, const QJsonDocument& document);
  static QJsonDocument readJson(const QString& path);

  QString m_rootPath;
  bool m_ready = false;
};
