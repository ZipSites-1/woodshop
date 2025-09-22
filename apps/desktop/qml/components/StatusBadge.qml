import QtQuick 2.15
import QtQuick.Controls 2.15

Label {
  id: root
  property string status: "pending"
  padding: 4
  leftPadding: 8
  rightPadding: 8
  font.pixelSize: 11
  background: Rectangle {
    radius: 6
    color: root.status === "done" ? "#166534" : root.status === "error" ? "#7f1d1d" : "#374151"
  }
  color: "white"
  text: status
}
