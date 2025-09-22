import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
  id: root
  color: "#7f1d1d"
  implicitHeight: 36

  RowLayout {
    anchors.fill: parent
    anchors.leftMargin: 16
    anchors.rightMargin: 16
    spacing: 8

    Label {
      text: qsTr("Offline mode: actions will queue and retry")
      color: "white"
      font.pixelSize: 13
    }
    Item { Layout.fillWidth: true }
    Button {
      text: qsTr("Retry now")
      onClicked: AppController.refreshConnection()
    }
  }
}
