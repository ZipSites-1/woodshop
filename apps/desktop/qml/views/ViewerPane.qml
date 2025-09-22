import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
  id: root
  property var viewerBridge

  Rectangle {
    anchors.fill: parent
    color: "#0b1120"
  }

  ColumnLayout {
    anchors.fill: parent
    anchors.margins: 16
    spacing: 12

    RowLayout {
      Layout.fillWidth: true
      Label {
        text: qsTr("Viewer")
        font.pixelSize: 18
        color: "white"
      }
      Item { Layout.fillWidth: true }
      Label {
        text: viewerBridge && viewerBridge.lastLoadedArtifact ? qsTr("Artifact: %1").arg(viewerBridge.lastLoadedArtifact) : qsTr("No artifact loaded")
        color: "#94a3b8"
      }
      Button {
        text: qsTr("Load Demo Artifact")
        onClicked: viewerBridge ? viewerBridge.loadArtifact("artifacts/demo/demo_post_preview.svg") : null
      }
    }

    SplitView {
      Layout.fillWidth: true
      Layout.fillHeight: true
      orientation: Qt.Horizontal

      Rectangle {
        Layout.fillWidth: true
        Layout.fillHeight: true
        color: "#111827"
        border.color: "#1f2937"
        radius: 12
        ColumnLayout {
          anchors.fill: parent
          anchors.margins: 24
          spacing: 12
          Label {
            text: qsTr("OCCT viewport placeholder")
            color: "#e5e7eb"
            font.pixelSize: 16
          }
          Label {
            color: "#94a3b8"
            wrapMode: Text.Wrap
            text: qsTr("Future work: embed OCCT scene graph here with selection, highlighting, and measurement overlays.")
          }
          Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            radius: 12
            color: "#0f172a"
            border.color: "#1e293b"
            Label {
              anchors.centerIn: parent
              color: "#1d4ed8"
              text: qsTr("Viewer ready for OCCT bridge")
            }
          }
        }
      }

      ColumnLayout {
        Layout.preferredWidth: 220
        spacing: 8
        Label {
          text: qsTr("Revisions")
          color: "white"
          font.pixelSize: 14
        }
        ListView {
          id: revisionList
          Layout.fillWidth: true
          Layout.fillHeight: true
          model: AppController.revisionModel
          delegate: Rectangle {
            width: revisionList.width
            height: 46
            radius: 8
            color: model.current ? "#1d4ed8" : "#1f2937"
            border.color: "#1e3a8a"
            Text {
              anchors.centerIn: parent
              text: model.label
              color: "white"
            }
            MouseArea {
              anchors.fill: parent
              onClicked: AppController.gotoRevision(index)
            }
          }
        }
        Frame {
          Layout.fillWidth: true
          padding: 8
          background: Rectangle { color: "#1f2937"; radius: 8 }
          ColumnLayout {
            anchors.fill: parent
            spacing: 4
            Label {
              text: qsTr("Measure Tool")
              color: "#e5e7eb"
              font.pixelSize: 13
            }
            Label {
              text: qsTr("Distance: 0.000 mm")
              color: "#94a3b8"
              font.pixelSize: 12
            }
            Button {
              text: qsTr("Capture")
              enabled: false
            }
          }
        }
      }
    }
  }
}
