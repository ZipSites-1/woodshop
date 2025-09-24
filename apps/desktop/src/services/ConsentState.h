#pragma once

#include <QString>
#include <QVariantMap>
#include <optional>

// Scaffolding struct introduced during AI Assisted Development planning for consent gating.
// TODO: relocate into the final owning class and ensure lifecycle resets after each destructive call.
struct ConsentState
{
  std::optional<QString> token;
  std::optional<QString> toolName;
  QVariantMap pendingInput;
  QString pendingMessageId;
  bool pending = false;

  void clear()
  {
    token.reset();
    toolName.reset();
    pendingInput.clear();
    pendingMessageId.clear();
    pending = false;
  }
};
