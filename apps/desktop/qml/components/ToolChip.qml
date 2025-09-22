import QtQuick 2.15
import QtQuick.Controls 2.15

Button {
  id: root
  property string toolName: ""
  property var payload: ({})
  padding: 8
  leftPadding: 14
  rightPadding: 14
  font.pixelSize: 12
  background: Rectangle {
    radius: 16
    color: "#1f2937"
    border.color: "#4b5563"
  }
  contentItem: Row {
    spacing: 6
    anchors.centerIn: parent
    Label {
      text: root.text
      color: "#e5e7eb"
      font.pixelSize: 13
    }
  }
  onClicked: AppController.runTool(toolName, payload)
}
