#include <QtTest/QtTest>

#include "models/ActionCardModel.h"
#include "models/ChatModel.h"
#include "models/RevisionModel.h"

class DesktopModelsTest : public QObject
{
  Q_OBJECT

private slots:
  void chatModelSerializes()
  {
    ChatModel model;
    const QString userId = model.appendUserMessage("hello");
    QVERIFY(!userId.isEmpty());
    const QString assistantId = model.appendAssistantPlaceholder("pending");
    QVERIFY(!assistantId.isEmpty());
    model.updateMessage(assistantId, "done");
    model.updateStatus(assistantId, "done");
    model.appendTraceStep(assistantId, QVariantMap{{"type", "tool_call"}});

    const QVector<QVariantMap> snapshot = model.serialize();
    QCOMPARE(snapshot.size(), 2);

    ChatModel clone;
    clone.hydrate(snapshot);
    QCOMPARE(clone.rowCount(), 2);
    const QModelIndex idx = clone.index(1, 0);
    QCOMPARE(clone.data(idx, ChatModel::MessageRole).toString(), QStringLiteral("done"));
    QCOMPARE(clone.data(idx, ChatModel::StatusRole).toString(), QStringLiteral("done"));
    QVERIFY(clone.data(idx, ChatModel::TraceRole).toList().size() == 1);
  }

  void actionCardModelLifecycle()
  {
    ActionCardModel model;
    const QString cardId = model.appendInFlight("generate_toolpaths", QVariantMap{{"project_id", "demo"}});
    QVERIFY(!cardId.isEmpty());
    model.markCompleted(cardId, QVariantMap{{"summary", "ok"}}, 123.0, QStringList{QStringLiteral("artifact.json")});
    const QModelIndex idx = model.index(0, 0);
    QCOMPARE(model.data(idx, ActionCardModel::StatusRole).toString(), QStringLiteral("done"));
    QCOMPARE(model.data(idx, ActionCardModel::LinksRole).toStringList().first(), QStringLiteral("artifact.json"));

    const QVector<QVariantMap> snapshot = model.serialize();
    ActionCardModel restored;
    restored.hydrate(snapshot);
    const QModelIndex restoredIdx = restored.index(0, 0);
    QCOMPARE(restored.data(restoredIdx, ActionCardModel::StatusRole).toString(), QStringLiteral("done"));
  }

  void revisionModelUndoRedo()
  {
    RevisionModel model;
    model.pushRevision("rev1", "Initial");
    model.pushRevision("rev2", "Toolpath");
    QCOMPARE(model.canUndo(), true);
    model.undo();
    QCOMPARE(model.currentRevisionId(), QStringLiteral("rev1"));
    QCOMPARE(model.canRedo(), true);
    model.redo();
    QCOMPARE(model.currentRevisionId(), QStringLiteral("rev2"));

    const QVector<QVariantMap> snapshot = model.serialize();
    RevisionModel restored;
    restored.hydrate(snapshot);
    QCOMPARE(restored.currentRevisionId(), QStringLiteral("rev2"));
  }
};

QTEST_APPLESS_MAIN(DesktopModelsTest)
#include "tst_chatmodel.moc"
