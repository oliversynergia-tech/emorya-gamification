UPDATE quest_definitions
SET metadata = metadata || '{
  "questions": [
    {
      "id": "q1",
      "text": "What XP multiplier does an Annual Premium subscriber receive?",
      "options": ["1.10x", "1.25x", "1.50x", "2.00x"],
      "correctIndex": 2
    },
    {
      "id": "q2",
      "text": "What token multiplier does a Monthly Premium subscriber receive compared to the free tier?",
      "options": ["Same as free", "1.15x", "1.30x", "1.50x"],
      "correctIndex": 1
    },
    {
      "id": "q3",
      "text": "How many eligibility points are needed before token redemption becomes available?",
      "options": ["50 points", "75 points", "100 points", "200 points"],
      "correctIndex": 2
    },
    {
      "id": "q4",
      "text": "What happens to your XP earnings when you upgrade from Monthly to Annual Premium?",
      "options": ["They stay the same", "They increase from 1.25x to 1.50x", "They double", "They reset to zero"],
      "correctIndex": 1
    },
    {
      "id": "q5",
      "text": "What direct token reward does the Annual upgrade quest include?",
      "options": ["10 EMR", "25 EMR", "50 EMR", "100 EMR"],
      "correctIndex": 1
    }
  ]
}'::jsonb,
is_active = TRUE,
updated_at = NOW()
WHERE slug = 'premium-economics-quiz';

UPDATE quest_definitions
SET metadata = metadata || '{
  "questions": [
    {
      "id": "q1",
      "text": "What does the quiz verification lane validate?",
      "options": ["Screenshot evidence", "Wallet ownership", "Knowledge through scored questions", "External API callback"],
      "correctIndex": 2
    },
    {
      "id": "q2",
      "text": "What happens if a user fails a quiz quest?",
      "options": ["Their account is locked", "They can retry", "The quest is permanently failed", "An admin must reset it"],
      "correctIndex": 1
    },
    {
      "id": "q3",
      "text": "Which field in the quest metadata controls the minimum correct answers needed?",
      "options": ["minScore", "passScore", "requiredCorrect", "threshold"],
      "correctIndex": 1
    }
  ]
}'::jsonb,
updated_at = NOW()
WHERE slug = 'demo-quiz-readiness-check';
