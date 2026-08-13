import type { InstantRules } from "@instantdb/react";

const rules = {
  "$users": {
    "allow": {
      "view": "true",
      "create": "false",
      "delete": "false",
      "update": "auth.id == data.id"
    }
  },
  "sources": {
    "allow": {
      "view": "true",
      "create": "true",
      "update": "true",
      "delete": "true"
    }
  },
  "buyers": {
    "allow": {
      "view": "true",
      "create": "true",
      "update": "true",
      "delete": "true"
    }
  },
  "intents": {
    "allow": {
      "view": "true",
      "create": "true",
      "update": "true",
      "delete": "true"
    }
  },
  "scan_logs": {
    "allow": {
      "view": "true",
      "create": "true",
      "update": "true",
      "delete": "true"
    }
  }
} satisfies InstantRules;

export default rules;
