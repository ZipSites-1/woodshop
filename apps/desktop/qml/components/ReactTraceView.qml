import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
  id: root
  property var trace: []
  spacing: 6

  Repeater {
    model: trace
    delegate: Frame {
      Layout.fillWidth: true
      background: Rectangle { color: "#0f172a"; radius: 8; border.color: "#1e293b" }
      padding: 8
      ColumnLayout {
        anchors.fill: parent
        spacing: 4
        Label {
          text: modelData.type ? modelData.type : "step"
          font.pixelSize: 12
          color: "#38bdf8"
        }
        Text {
          text: JSON.stringify(modelData, undefined, 2)
          font.pixelSize: 11
          color: "#e2e8f0"
          wrapMode: Text.Wrap
        }
      }
    }
  }
}
