import QtQuick 2.15
import QtQuick.Controls 2.15

// Placeholder consent prompt component scaffolded during AI Assisted Development planning.
// TODO: refine styling, focus handling, and internationalization before shipping.
Item {
  id: root
  visible: false
  property string toolName: ""
  signal confirm()
  signal cancel()

  anchors.fill: parent
  z: visible ? 1000 : -1

  Rectangle {
    anchors.fill: parent
    color: "#0f172a80"
    visible: root.visible
  }

  MouseArea {
    anchors.fill: parent
    enabled: root.visible
    onClicked: {} // swallow events while modal is open
  }

  Rectangle {
    anchors.centerIn: parent
    width: 360
    radius: 8
    color: "#1c1c1c"
    visible: root.visible

    Column {
      anchors.fill: parent
      anchors.margins: 24
      spacing: 16

      Label {
        text: "Confirm consent"
        font.bold: true
        font.pointSize: 16
        color: "white"
      }

      Text {
        text: "The operation '" + root.toolName + "' may overwrite artifacts or generate machine code. Confirm to proceed."
        wrapMode: Text.WordWrap
        color: "#d0d0d0"
      }

      Row {
        spacing: 12
        Button {
          text: "Cancel"
          onClicked: root.cancel()
        }
        Button {
          text: "Confirm"
          highlighted: true
          onClicked: root.confirm()
        }
      }
    }
  }
}
