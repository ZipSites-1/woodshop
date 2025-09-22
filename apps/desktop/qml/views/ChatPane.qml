import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../components" as Components

Item {
  id: root
  property alias chatModel: chatList.model
  property alias actionCardModel: cardList.model

  Rectangle {
    anchors.fill: parent
    color: "#111827"
    border.color: "#1f2937"
    border.width: 1
  }

  ColumnLayout {
    anchors.fill: parent
    anchors.margins: 12
    spacing: 16

    Label {
      text: qsTr("Chat")
      font.pixelSize: 18
      color: "white"
    }

    ListView {
      id: chatList
      Layout.fillWidth: true
      Layout.fillHeight: true
      clip: true
      delegate: Item {
        width: chatList.width
        property bool expanded: false
        ColumnLayout {
          anchors.fill: parent
          spacing: 6
          Frame {
            Layout.fillWidth: true
            background: Rectangle { color: "#1f2937"; radius: 10; border.color: "#1f2937" }
            padding: 10
            ColumnLayout {
              anchors.fill: parent
              spacing: 6
              RowLayout {
                Layout.fillWidth: true
                Label {
                  text: model.sender + (model.timestamp ? " • " + model.timestamp.toLocaleTimeString() : "")
                  color: "#94a3b8"
                  font.pixelSize: 12
                }
                Item { Layout.fillWidth: true }
                StatusBadge { status: model.status }
              }
              Text {
                text: model.message
                color: "#e5e7eb"
                wrapMode: Text.Wrap
              }
              RowLayout {
                Layout.fillWidth: true
                visible: model.trace && model.trace.length > 0
                ToolButton {
                  text: expanded ? qsTr("Hide trace") : qsTr("Show trace")
                  onClicked: expanded = !expanded
                }
                Item { Layout.fillWidth: true }
              }
              Components.ReactTraceView {
                Layout.fillWidth: true
                visible: expanded
                trace: model.trace
              }
            }
          }
        }
      }
      footer: Item {
        width: chatList.width
        height: 64
        ColumnLayout {
          anchors.fill: parent
          spacing: 8
          Flow {
            Layout.fillWidth: true
            spacing: 8
            Components.ToolChip {
              text: qsTr("Generate toolpaths")
              toolName: "generate_toolpaths"
              payload: ({ project_id: "demo_credenza", operations: [ { type: "contour", name: "Perimeter" } ] })
            }
            Components.ToolChip {
              text: qsTr("Postprocess GRBL")
              toolName: "postprocess_grbl"
              payload: ({ project_id: "demo_credenza", controller: "grbl", confirm_write: true })
            }
            Components.ToolChip {
              text: qsTr("Make drawing")
              toolName: "make_drawing"
              payload: ({ project_id: "demo_credenza", format: "A3" })
            }
          }
          RowLayout {
            Layout.fillWidth: true
            spacing: 8
            TextField {
              id: input
              Layout.fillWidth: true
              placeholderText: qsTr("Ask Woodshop...")
              onAccepted: sendBtn.clicked()
            }
            Button {
              id: sendBtn
              text: qsTr("Send")
              enabled: input.text.length > 0
              onClicked: {
                if (input.text.length === 0) {
                  return
                }
                AppController.sendChatMessage(input.text)
                input.clear()
              }
            }
          }
        }
      }
    }

    Label {
      text: qsTr("Action Cards")
      font.pixelSize: 18
      color: "white"
    }

    ListView {
      id: cardList
      Layout.fillWidth: true
      Layout.preferredHeight: 240
      clip: true
      delegate: ActionCard {
        width: cardList.width
        title: model.title
        status: model.status
        durationMs: model.durationMs
        links: model.links
        error: model.error
      }
    }
  }
}
