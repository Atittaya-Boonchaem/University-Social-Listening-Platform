# WangchanBERTa deployment package

Contents:

- app.py: real-time FastAPI endpoint
- complaint_classifier.py: model loading, normalization, scoring, and review policy
- admin_routes.json: replace placeholder IDs with real admin IDs or queues
- requirements.txt: dependencies
- run_server.ps1: starts the API on Windows
- export_model_from_colab.py: final Colab export cell
- model: place the exported trained model here

## Before starting

1. In Colab, run the code in export_model_from_colab.py after WangchanBERTa finishes training.
2. Download wangchanberta_deployment_model.zip.
3. Extract its contents into the model folder.
4. Edit admin_routes.json.

The model folder must contain model.safetensors, config.json, tokenizer files, and
model_contract.json. Do not copy a model from another experiment without its matching
model contract.

## Start the API

From this folder:

    python -m pip install -r requirements.txt
    powershell -ExecutionPolicy Bypass -File .\run_server.ps1

Open http://127.0.0.1:8000/docs to test the API.

POST /classify example:

    {
      "complaint_text": "ห้องน้ำอาคารเรียนมีน้ำรั่วและพื้นลื่นมาก",
      "show_threshold_percent": 50
    }

The model determines final_labels from validation-selected decision thresholds.
show_threshold_percent changes only shown_scores and cannot alter routing.

Inputs that are close to a decision threshold, or do not match a core category, go
to central_human_review. Other inputs go to category-admin routes.

Use facilities, not building, as the label for buildings, restrooms, electricity,
water, equipment, and repair issues.
