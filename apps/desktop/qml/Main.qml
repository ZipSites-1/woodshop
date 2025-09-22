import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "views"
import "components"

ApplicationWindow {
  id: root
  width: 1280
  height: 800
  visible: true
  title: qsTr("Woodshop Desktop Preview")

  background: Rectangle { color: "#0f172a" }

  header: ToolBar {
    contentHeight: implicitHeight
    RowLayout {
      anchors.fill: parent
      ToolButton {
        text: qsTr("Undo")
        enabled: AppController.revisionModel.canUndo()
        onClicked: AppController.undo()
      }
      ToolButton {
        text: qsTr("Redo")
        enabled: AppController.revisionModel.canRedo()
        onClicked: AppController.redo()
      }
      Item { Layout.fillWidth: true }
      RowLayout {
        spacing: 8
        Label {
          text: AppController.mcpSession.connected ? qsTr("Connected") : qsTr("Offline")
          color: AppController.mcpSession.connected ? "#22c55e" : "#f97316"
        }
        Label {
          visible: AppController.mcpSession.busy
          text: qsTr("Running…")
          color: "#38bdf8"
        }
        ToolButton {
          text: qsTr("Retry")
          visible: !AppController.mcpSession.connected
          onClicked: AppController.refreshConnection()
        }
      }
    }
  }

  ColumnLayout {
    anchors.fill: parent
    spacing: 0

    OfflineBanner {
      Layout.fillWidth: true
      visible: !AppController.mcpSession.connected
    }

    SplitView {
      Layout.fillWidth: true
      Layout.fillHeight: true
      orientation: Qt.Horizontal

      ChatPane {
        Layout.fillHeight: true
        Layout.preferredWidth: 420
        chatModel: AppController.chatModel
        actionCardModel: AppController.actionCardModel
      }

      ViewerPane {
        Layout.fillHeight: true
        Layout.fillWidth: true
        viewerBridge: AppController.viewerBridge
      }
    }
  }
}
