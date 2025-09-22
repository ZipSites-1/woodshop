import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Frame {
  id: root
  property string title: ""
  property string status: "pending"
  property double durationMs: 0
  property var links: []
  property string error: ""
  padding: 12
  background: Rectangle { color: "#1f2937"; radius: 8 }

  ColumnLayout {
    anchors.fill: parent
    spacing: 6

    RowLayout {
      Layout.fillWidth: true
      Label {
        text: root.title
        font.pixelSize: 16
        color: "white"
        Layout.fillWidth: true
      }
      StatusBadge {
        status: root.status
      }
    }

    Label {
      text: durationMs > 0 ? qsTr("%1 ms").arg(durationMs.toFixed(0)) : qsTr("Pending")
      color: "#9ca3af"
      font.pixelSize: 12
    }

    Label {
      visible: error.length > 0
      text: error
      color: "#fca5a5"
      font.pixelSize: 12
      wrapMode: Text.Wrap
    }

    Repeater {
      model: links
      delegate: Button {
        text: modelData
        onClicked: Qt.openUrlExternally(modelData)
      }
    }
  }
}
