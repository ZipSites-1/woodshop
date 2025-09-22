#include "OcctViewerBridge.h"

OcctViewerBridge::OcctViewerBridge(QObject* parent)
  : QObject(parent)
{
}

void OcctViewerBridge::prepare()
{
  // Future integration will initialise OCCT contexts; scaffold keeps this a no-op.
}

void OcctViewerBridge::loadArtifact(const QString& artifactPath)
{
  if (artifactPath.isEmpty()) {
    return;
  }

  if (m_lastLoadedArtifact != artifactPath) {
    m_lastLoadedArtifact = artifactPath;
    emit lastLoadedArtifactChanged();
  }

  emit artifactLoaded(artifactPath);
}

QString OcctViewerBridge::lastLoadedArtifact() const
{
  return m_lastLoadedArtifact;
}
