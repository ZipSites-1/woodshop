#pragma once

#include <QObject>
#include <QString>

class OcctViewerBridge : public QObject
{
  Q_OBJECT
  Q_PROPERTY(QString lastLoadedArtifact READ lastLoadedArtifact NOTIFY lastLoadedArtifactChanged)

public:
  explicit OcctViewerBridge(QObject* parent = nullptr);

  void prepare();

  Q_INVOKABLE void loadArtifact(const QString& artifactPath);
  [[nodiscard]] QString lastLoadedArtifact() const;

signals:
  void lastLoadedArtifactChanged();
  void artifactLoaded(const QString& artifactPath);

private:
  QString m_lastLoadedArtifact;
};
