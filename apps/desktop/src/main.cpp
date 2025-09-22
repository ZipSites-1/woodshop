#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>

#include <memory>

#include "app/AppController.h"

int main(int argc, char* argv[])
{
  QGuiApplication app(argc, argv);
  QQmlApplicationEngine engine;

  auto controller = std::make_unique<AppController>();
  controller->initialize();

  engine.rootContext()->setContextProperty("AppController", controller.get());
  engine.addImportPath("qrc:/");
  const QUrl mainUrl(QStringLiteral("qrc:/Main.qml"));

  QObject::connect(&engine, &QQmlApplicationEngine::objectCreationFailed, &app, []() {
    QCoreApplication::exit(-1);
  }, Qt::QueuedConnection);

  engine.load(mainUrl);

  const int exitCode = app.exec();
  controller.reset();
  return exitCode;
}
