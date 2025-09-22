#include "OfflineCache.h"

#include <QCoreApplication>
#include <QDir>
#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QStandardPaths>

OfflineCache::OfflineCache(QObject* parent)
  : QObject(parent)
{
}

void OfflineCache::initialize()
{
  const QString cacheLocation = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation);
  if (cacheLocation.isEmpty()) {
    return;
  }

  QDir directory(cacheLocation);
  if (!directory.exists()) {
    directory.mkpath(QStringLiteral("."));
  }

  const QStringList requiredDirs = {
    QStringLiteral("artifacts"),
    QStringLiteral("logs"),
  };
  for (const QString& dir : requiredDirs) {
    if (!directory.exists(dir)) {
      directory.mkpath(dir);
    }
  }

  if (m_rootPath != directory.absolutePath()) {
    m_rootPath = directory.absolutePath();
    emit rootPathChanged();
  }

  if (!m_ready) {
    m_ready = true;
    emit readyChanged();
  }
}

QString OfflineCache::rootPath() const
{
  return m_rootPath;
}

bool OfflineCache::isReady() const
{
  return m_ready;
}

QVector<QVariantMap> OfflineCache::loadConversation() const
{
  const QJsonDocument doc = readJson(conversationsPath());
  QVector<QVariantMap> entries;
  if (!doc.isArray()) {
    return entries;
  }
  const QJsonArray array = doc.array();
  for (const QJsonValue& value : array) {
    entries.append(value.toObject().toVariantMap());
  }
  return entries;
}

QVector<QVariantMap> OfflineCache::loadActionCards() const
{
  const QJsonDocument doc = readJson(actionCardsPath());
  QVector<QVariantMap> entries;
  if (!doc.isArray()) {
    return entries;
  }
  const QJsonArray array = doc.array();
  for (const QJsonValue& value : array) {
    entries.append(value.toObject().toVariantMap());
  }
  return entries;
}

QVector<QVariantMap> OfflineCache::loadRevisions() const
{
  const QJsonDocument doc = readJson(revisionsPath());
  QVector<QVariantMap> entries;
  if (!doc.isArray()) {
    return entries;
  }
  const QJsonArray array = doc.array();
  for (const QJsonValue& value : array) {
    entries.append(value.toObject().toVariantMap());
  }
  return entries;
}

QList<QVariantMap> OfflineCache::loadQueuedCalls() const
{
  const QJsonDocument doc = readJson(queuePath());
  QList<QVariantMap> calls;
  if (!doc.isArray()) {
    return calls;
  }
  for (const QJsonValue& value : doc.array()) {
    calls.append(value.toObject().toVariantMap());
  }
  return calls;
}

void OfflineCache::saveConversation(const QVector<QVariantMap>& entries)
{
  QJsonArray array;
  for (const QVariantMap& item : entries) {
    array.append(QJsonObject::fromVariantMap(item));
  }
  writeJson(conversationsPath(), QJsonDocument(array));
}

void OfflineCache::saveActionCards(const QVector<QVariantMap>& cards)
{
  QJsonArray array;
  for (const QVariantMap& item : cards) {
    array.append(QJsonObject::fromVariantMap(item));
  }
  writeJson(actionCardsPath(), QJsonDocument(array));
}

void OfflineCache::saveRevisions(const QVector<QVariantMap>& revisions)
{
  QJsonArray array;
  for (const QVariantMap& item : revisions) {
    array.append(QJsonObject::fromVariantMap(item));
  }
  writeJson(revisionsPath(), QJsonDocument(array));
}

void OfflineCache::saveQueuedCalls(const QList<QVariantMap>& queuedCalls)
{
  QJsonArray array;
  for (const QVariantMap& call : queuedCalls) {
    array.append(QJsonObject::fromVariantMap(call));
  }
  writeJson(queuePath(), QJsonDocument(array));
}

QString OfflineCache::conversationsPath() const
{
  return m_rootPath + QStringLiteral("/conversations.json");
}

QString OfflineCache::actionCardsPath() const
{
  return m_rootPath + QStringLiteral("/actions.json");
}

QString OfflineCache::revisionsPath() const
{
  return m_rootPath + QStringLiteral("/revisions.json");
}

QString OfflineCache::queuePath() const
{
  return m_rootPath + QStringLiteral("/queued_calls.json");
}

QString OfflineCache::artifactsPath() const
{
  return m_rootPath + QStringLiteral("/artifacts");
}

bool OfflineCache::writeJson(const QString& path, const QJsonDocument& document)
{
  QFile file(path);
  if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
    return false;
  }
  const qint64 written = file.write(document.toJson(QJsonDocument::Compact));
  file.close();
  return written >= 0;
}

QJsonDocument OfflineCache::readJson(const QString& path)
{
  QFile file(path);
  if (!file.exists() || !file.open(QIODevice::ReadOnly)) {
    return {};
  }
  const QByteArray data = file.readAll();
  file.close();
  const QJsonDocument doc = QJsonDocument::fromJson(data);
  if (doc.isNull()) {
    return {};
  }
  return doc;
}
