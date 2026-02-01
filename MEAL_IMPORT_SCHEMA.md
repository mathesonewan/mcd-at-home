# Meal Import JSON Schema

Upload JSON should be an object with a `meals` array. Each meal follows this schema.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Meal Import",
  "type": "object",
  "required": ["meals"],
  "properties": {
    "meals": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name": { "type": "string", "minLength": 1 },
          "meal_type": {
            "type": "string",
            "enum": ["lunch", "dinner"]
          },
          "tags": {
            "type": "array",
            "items": { "type": "string" }
          },
          "method_steps": {
            "type": "array",
            "items": { "type": "string" }
          },
          "nutrition_unknown": { "type": "boolean" },
          "nutrition": {
            "type": "object",
            "properties": {
              "kcal": { "type": ["number", "null"] },
              "protein_g": { "type": ["number", "null"] },
              "carbs_g": { "type": ["number", "null"] },
              "fat_g": { "type": ["number", "null"] },
              "fibre_g": { "type": ["number", "null"] },
              "source": { "type": ["string", "null"] }
            }
          },
          "ingredients": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["name"],
              "properties": {
                "name": { "type": "string", "minLength": 1 },
                "quantity": { "type": ["number", "null"] },
                "unit": { "type": ["string", "null"] },
                "category": { "type": ["string", "null"] }
              }
            }
          },
          "leftover_followup_meal_id": { "type": ["integer", "null"] },
          "leftover_followup_offset_days": { "type": "integer", "minimum": 1, "maximum": 6 },
          "leftover_followup_required": { "type": "boolean" }
        }
      }
    }
  }
}
```

Example payload:

```json
{
  "meals": [
    {
      "name": "Caprese Toast",
      "meal_type": "lunch",
      "tags": ["vegetarian", "quick"],
      "method_steps": ["Toast bread", "Top with tomato and mozzarella"],
      "nutrition_unknown": true,
      "ingredients": [
        { "name": "Bread", "quantity": 2, "unit": "slices", "category": "pantry" },
        { "name": "Tomato", "quantity": 120, "unit": "g", "category": "veg" }
      ]
    }
  ]
}
```
