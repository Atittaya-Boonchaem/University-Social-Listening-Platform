---
tags:
- sentence-transformers
- sentence-similarity
- feature-extraction
- dense
- generated_from_trainer
- dataset_size:850
- loss:CosineSimilarityLoss
base_model: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
widget:
- source_sentence: หลอดไฟทางเดินหน้า ตึก EN ดับสนิท มืดมาก
  sentences:
  - ถังขยะหน้า ตึก EN ขยะล้นถัง ส่งกลิ่นเหม็นเน่า
  - ถังขยะหน้า ตึก EN ขยะล้นถัง ส่งกลิ่นเหม็นเน่า
  - ถังขยะหน้า ตึก EN ขยะล้นถัง ส่งกลิ่นเหม็นเน่า
- source_sentence: หลอดไฟทางเดินหน้า ตึก EN ดับสนิท มืดมาก
  sentences:
  - ถังขยะหน้า ตึก EN ขยะล้นถัง ส่งกลิ่นเหม็นเน่า
  - ถังขยะหน้า ตึก ICT ขยะล้นถัง ส่งกลิ่นเหม็นเน่า
  - สุนัขจรจัดดุมาก วิ่งไล่กวดนิสิตตรง ตึก EN
- source_sentence: หลอดไฟทางเดินหน้า ตึก CE ดับสนิท มืดมาก
  sentences:
  - สุนัขจรจัดดุมาก วิ่งไล่กวดนิสิตตรง ตึก CE
  - ถังขยะหน้า ตึก CE ขยะล้นถัง ส่งกลิ่นเหม็นเน่า
  - ถังขยะหน้า ตึก PKY ขยะล้นถัง ส่งกลิ่นเหม็นเน่า
- source_sentence: หลอดไฟทางเดินหน้า ตึก EN ดับสนิท มืดมาก
  sentences:
  - ถังขยะหน้า ตึก EN ขยะล้นถัง ส่งกลิ่นเหม็นเน่า
  - ถังขยะหน้า ตึก ICT ขยะล้นถัง ส่งกลิ่นเหม็นเน่า
  - สุนัขจรจัดดุมาก วิ่งไล่กวดนิสิตตรง ตึก EN
- source_sentence: หลอดไฟทางเดินหน้า ตึก EN ดับสนิท มืดมาก
  sentences:
  - ถังขยะหน้า ตึก EN ขยะล้นถัง ส่งกลิ่นเหม็นเน่า
  - ถังขยะหน้า ตึก ICT ขยะล้นถัง ส่งกลิ่นเหม็นเน่า
  - ถังขยะหน้า ตึก PKY ขยะล้นถัง ส่งกลิ่นเหม็นเน่า
pipeline_tag: sentence-similarity
library_name: sentence-transformers
metrics:
- pearson_cosine
- spearman_cosine
model-index:
- name: SentenceTransformer based on sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
  results:
  - task:
      type: semantic-similarity
      name: Semantic Similarity
    dataset:
      name: up test eval
      type: up-test-eval
    metrics:
    - type: pearson_cosine
      value: 0.9974956782034878
      name: Pearson Cosine
    - type: spearman_cosine
      value: 0.8495612299685653
      name: Spearman Cosine
---

# SentenceTransformer based on sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

This is a [sentence-transformers](https://www.SBERT.net) model finetuned from [sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2). It maps inputs to a 384-dimensional dense vector space and can be used for semantic textual similarity, semantic search, paraphrase mining, classification, clustering, and more.

## Model Details

### Model Description
- **Model Type:** Sentence Transformer
- **Base model:** [sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2) <!-- at revision e8f8c211226b894fcb81acc59f3b34ba3efd5f42 -->
- **Maximum Sequence Length:** 128 tokens
- **Output Dimensionality:** 384 dimensions
- **Similarity Function:** Cosine Similarity
- **Supported Modality:** Text
<!-- - **Training Dataset:** Unknown -->
<!-- - **Language:** Unknown -->
<!-- - **License:** Unknown -->

### Model Sources

- **Documentation:** [Sentence Transformers Documentation](https://sbert.net)
- **Repository:** [Sentence Transformers on GitHub](https://github.com/huggingface/sentence-transformers)
- **Hugging Face:** [Sentence Transformers on Hugging Face](https://huggingface.co/models?library=sentence-transformers)

### Full Model Architecture

```
SentenceTransformer(
  (0): Transformer({'transformer_task': 'feature-extraction', 'modality_config': {'text': {'method': 'forward', 'method_output_name': 'last_hidden_state'}}, 'module_output_name': 'token_embeddings', 'architecture': 'BertModel'})
  (1): Pooling({'embedding_dimension': 384, 'pooling_mode': 'mean', 'include_prompt': True})
)
```

## Usage

### Direct Usage (Sentence Transformers)

First install the Sentence Transformers library:

```bash
pip install -U sentence-transformers
```
Then you can load this model and run inference.
```python
from sentence_transformers import SentenceTransformer

# Download from the 🤗 Hub
model = SentenceTransformer("sentence_transformers_model_id")
# Run inference
sentences = [
    'หลอดไฟทางเดินหน้า ตึก EN ดับสนิท มืดมาก',
    'ถังขยะหน้า ตึก EN ขยะล้นถัง ส่งกลิ่นเหม็นเน่า',
    'ถังขยะหน้า ตึก PKY ขยะล้นถัง ส่งกลิ่นเหม็นเน่า',
]
embeddings = model.encode(sentences)
print(embeddings.shape)
# [3, 384]

# Get the similarity scores for the embeddings
similarities = model.similarity(embeddings, embeddings)
print(similarities)
# tensor([[1.0000, 0.0525, 0.0523],
#         [0.0525, 1.0000, 0.9968],
#         [0.0523, 0.9968, 1.0000]])
```
<!--
### Direct Usage (Transformers)

<details><summary>Click to see the direct usage in Transformers</summary>

</details>
-->

<!--
### Downstream Usage (Sentence Transformers)

You can finetune this model on your own dataset.

<details><summary>Click to expand</summary>

</details>
-->

<!--
### Out-of-Scope Use

*List how the model may foreseeably be misused and address what users ought not to do with the model.*
-->

## Evaluation

### Metrics

#### Semantic Similarity

* Dataset: `up-test-eval`
* Evaluated with [<code>EmbeddingSimilarityEvaluator</code>](https://sbert.net/docs/package_reference/sentence_transformer/evaluation.html#sentence_transformers.sentence_transformer.evaluation.EmbeddingSimilarityEvaluator)

| Metric              | Value      |
|:--------------------|:-----------|
| pearson_cosine      | 0.9975     |
| **spearman_cosine** | **0.8496** |

<!--
## Bias, Risks and Limitations

*What are the known or foreseeable issues stemming from this model? You could also flag here known failure cases or weaknesses of the model.*
-->

<!--
### Recommendations

*What are recommendations with respect to the foreseeable issues? For example, filtering explicit content.*
-->

## Training Details

### Training Dataset

#### Unnamed Dataset

* Size: 850 training samples
* Columns: <code>sentence_0</code>, <code>sentence_1</code>, and <code>label</code>
* Approximate statistics based on the first 100 samples:
  |          | sentence_0                                                                         | sentence_1                                                                         | label                                                           |
  |:---------|:-----------------------------------------------------------------------------------|:-----------------------------------------------------------------------------------|:----------------------------------------------------------------|
  | type     | string                                                                             | string                                                                             | float                                                           |
  | modality | text                                                                               | text                                                                               |                                                                 |
  | details  | <ul><li>min: 15 tokens</li><li>mean: 22.89 tokens</li><li>max: 38 tokens</li></ul> | <ul><li>min: 15 tokens</li><li>mean: 24.36 tokens</li><li>max: 37 tokens</li></ul> | <ul><li>min: 0.0</li><li>mean: 0.56</li><li>max: 0.98</li></ul> |
* Samples:
  | sentence_0                                                                 | sentence_1                                                                        | label               |
  |:---------------------------------------------------------------------------|:----------------------------------------------------------------------------------|:--------------------|
  | <code>สอบถามขั้นตอนการขอทุนการศึกษานิสิตขาดแคลนทุนทรัพย์</code>            | <code>มีคนร้ายขโมยหมวกกันน็อคตรงลานจอดรถ ป้ายหอพักใน</code>                       | <code>0.0176</code> |
  | <code>รถเมล์มอสาย 4 รอนานมาก ไม่ยอมจอดรับที่ป้าย</code>                    | <code>อาหารที่โรงอาหาร คณะพยาบาลศาสตร์ มีรสเปรี้ยวบูด กินแล้วท้องเสีย</code>      | <code>0.0337</code> |
  | <code>มีคนร้ายกรีดเบาะรถและขโมยหมวกกันน็อคตรงลานจอด ประตู 1 ม.พะเยา</code> | <code>โดนขโมยหมวกกันน็อคและเบาะรถจักรยานยนต์โดนกรีดที่ลานจอดรถ ประตูหน้ามอ</code> | <code>0.9669</code> |
* Loss: [<code>CosineSimilarityLoss</code>](https://sbert.net/docs/package_reference/sentence_transformer/losses.html#cosinesimilarityloss) with these parameters:
  ```json
  {
      "loss_fct": "torch.nn.modules.loss.MSELoss",
      "cos_score_transformation": "torch.nn.modules.linear.Identity"
  }
  ```

### Training Hyperparameters
#### Non-Default Hyperparameters

- `per_device_train_batch_size`: 16
- `num_train_epochs`: 4
- `disable_tqdm`: True
- `per_device_eval_batch_size`: 16
- `multi_dataset_batch_sampler`: round_robin

#### All Hyperparameters
<details><summary>Click to expand</summary>

- `per_device_train_batch_size`: 16
- `num_train_epochs`: 4
- `max_steps`: -1
- `learning_rate`: 5e-05
- `lr_scheduler_type`: linear
- `lr_scheduler_kwargs`: None
- `warmup_steps`: 0
- `optim`: adamw_torch
- `optim_args`: None
- `weight_decay`: 0.0
- `adam_beta1`: 0.9
- `adam_beta2`: 0.999
- `adam_epsilon`: 1e-08
- `optim_target_modules`: None
- `gradient_accumulation_steps`: 1
- `average_tokens_across_devices`: True
- `max_grad_norm`: 1
- `label_smoothing_factor`: 0.0
- `bf16`: False
- `fp16`: False
- `bf16_full_eval`: False
- `fp16_full_eval`: False
- `tf32`: None
- `gradient_checkpointing`: False
- `gradient_checkpointing_kwargs`: None
- `torch_compile`: False
- `torch_compile_backend`: None
- `torch_compile_mode`: None
- `use_liger_kernel`: False
- `liger_kernel_config`: None
- `use_cache`: False
- `neftune_noise_alpha`: None
- `torch_empty_cache_steps`: None
- `auto_find_batch_size`: False
- `log_on_each_node`: True
- `logging_nan_inf_filter`: True
- `include_num_input_tokens_seen`: no
- `log_level`: passive
- `log_level_replica`: warning
- `disable_tqdm`: True
- `project`: huggingface
- `trackio_space_id`: trackio
- `per_device_eval_batch_size`: 16
- `prediction_loss_only`: True
- `eval_on_start`: False
- `eval_do_concat_batches`: True
- `eval_use_gather_object`: False
- `eval_accumulation_steps`: None
- `include_for_metrics`: []
- `batch_eval_metrics`: False
- `save_only_model`: False
- `save_on_each_node`: False
- `enable_jit_checkpoint`: False
- `push_to_hub`: False
- `hub_private_repo`: None
- `hub_model_id`: None
- `hub_strategy`: every_save
- `hub_always_push`: False
- `hub_revision`: None
- `load_best_model_at_end`: False
- `ignore_data_skip`: False
- `restore_callback_states_from_checkpoint`: False
- `full_determinism`: False
- `seed`: 42
- `data_seed`: None
- `use_cpu`: False
- `accelerator_config`: {'split_batches': False, 'dispatch_batches': None, 'even_batches': True, 'use_seedable_sampler': True, 'non_blocking': False, 'gradient_accumulation_kwargs': None}
- `parallelism_config`: None
- `dataloader_drop_last`: False
- `dataloader_num_workers`: 0
- `dataloader_pin_memory`: True
- `dataloader_persistent_workers`: False
- `dataloader_prefetch_factor`: None
- `remove_unused_columns`: True
- `label_names`: None
- `train_sampling_strategy`: random
- `length_column_name`: length
- `ddp_find_unused_parameters`: None
- `ddp_bucket_cap_mb`: None
- `ddp_broadcast_buffers`: False
- `ddp_backend`: None
- `ddp_timeout`: 1800
- `fsdp`: []
- `fsdp_config`: {'min_num_params': 0, 'xla': False, 'xla_fsdp_v2': False, 'xla_fsdp_grad_ckpt': False}
- `deepspeed`: None
- `debug`: []
- `skip_memory_metrics`: True
- `do_predict`: False
- `resume_from_checkpoint`: None
- `warmup_ratio`: None
- `local_rank`: -1
- `prompts`: None
- `batch_sampler`: batch_sampler
- `multi_dataset_batch_sampler`: round_robin
- `router_mapping`: {}
- `learning_rate_mapping`: {}

</details>

### Training Logs
| Epoch  | Step | up-test-eval_spearman_cosine |
|:------:|:----:|:----------------------------:|
| -1     | -1   | 0.7729                       |
| 0.3704 | 20   | 0.7729                       |
| 0.7407 | 40   | 0.8024                       |
| 1.0    | 54   | 0.8120                       |
| 1.1111 | 60   | 0.7878                       |
| 1.4815 | 80   | 0.8280                       |
| 1.8519 | 100  | 0.8118                       |
| 2.0    | 108  | 0.8302                       |
| 2.2222 | 120  | 0.8385                       |
| 2.5926 | 140  | 0.8449                       |
| 2.9630 | 160  | 0.8490                       |
| 3.0    | 162  | 0.8499                       |
| 3.3333 | 180  | 0.8464                       |
| 3.7037 | 200  | 0.8492                       |
| 4.0    | 216  | 0.8496                       |
| -1     | -1   | 0.8496                       |


### Training Time
- **Training**: 37.7 seconds
- **Evaluation**: 2.9 seconds
- **Total**: 40.6 seconds

### Framework Versions
- Python: 3.11.8
- Sentence Transformers: 6.0.0
- Transformers: 5.3.0
- PyTorch: 2.5.1+cu121
- Accelerate: 1.14.0
- Datasets: 5.0.1
- Tokenizers: 0.22.2

## Additional Resources

- [Training and Finetuning Embedding Models with Sentence Transformers](https://huggingface.co/blog/train-sentence-transformers): the end-to-end guide for training or finetuning Sentence Transformer models.
- [Introduction to Matryoshka Embedding Models](https://huggingface.co/blog/matryoshka): variable-size embeddings that can be truncated with minimal quality loss.
- [Binary and Scalar Embedding Quantization for Significantly Faster & Cheaper Retrieval](https://huggingface.co/blog/embedding-quantization): post-training compression of embedding vectors.
- [Multimodal Embedding & Reranker Models with Sentence Transformers](https://huggingface.co/blog/multimodal-sentence-transformers): use text, image, audio, and video models through the same API.
- [Training and Finetuning Multimodal Embedding & Reranker Models with Sentence Transformers](https://huggingface.co/blog/train-multimodal-sentence-transformers): train multimodal embedding models, with a Visual Document Retrieval walkthrough.

## Citation

### BibTeX

#### Sentence Transformers
```bibtex
@inproceedings{reimers-2019-sentence-bert,
    title = "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
    author = "Reimers, Nils and Gurevych, Iryna",
    booktitle = "Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing",
    month = "11",
    year = "2019",
    publisher = "Association for Computational Linguistics",
    url = "https://arxiv.org/abs/1908.10084",
}
```

<!--
## Glossary

*Clearly define terms in order to be accessible across audiences.*
-->

<!--
## Model Card Authors

*Lists the people who create the model card, providing recognition and accountability for the detailed work that goes into its construction.*
-->

<!--
## Model Card Contact

*Provides a way for people who have updates to the Model Card, suggestions, or questions, to contact the Model Card authors.*
-->