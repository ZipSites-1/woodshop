#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QQuickStyle>

#include <memory>

#include "app/AppController.h"

int main(int argc, char* argv[])
{
  QQuickStyle::setStyle(QStringLiteral("Basic"));
  QGuiApplication app(argc, argv);
  QQmlApplicationEngine engine;

  auto controller = std::make_unique<AppController>();
  controller->initialize();

  engine.rootContext()->setContextProperty("AppController", controller.get());
  const QUrl mainUrl(QStringLiteral("qrc:/Woodshop/Desktop/qml/Main.qml"));

  QObject::connect(&engine, &QQmlApplicationEngine::objectCreationFailed, &app, []() {
    QCoreApplication::exit(-1);
  }, Qt::QueuedConnection);

  engine.load(mainUrl);

  const int exitCode = app.exec();
  controller.reset();
  return exitCode;
}
