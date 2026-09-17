# scripts/evaluate_all_models.py
"""
Master AI Model Evaluation Runner
รันการทดสอบและประเมินผลประสิทธิภาพของโมเดล AI ทั้ง 3 โมเดลในคำสั่งเดียว
1. Model 1: Typhoon 2.5 (LLM Text Refinement, Moderation & 5W1H)
2. Model 2: WangchanBERTa (Multi-Label Category Classification)
3. Model 3: Sentence-BERT (SBERT Semantic Similarity & Post Aggregation)
"""
import sys
import os
import subprocess
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

def run_script(title: str, script_name: str):
    print("\n" + "#" * 75)
    print(f"🚀 RUNNING: {title} ({script_name})")
    print("#" * 75)
    t0 = time.time()
    try:
        res = subprocess.run(
            [sys.executable, f"scripts/{script_name}"],
            capture_output=False,
            text=True,
            check=True
        )
        elapsed = time.time() - t0
        print(f"\n✅ {title} Completed in {elapsed:.2f} seconds.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error running {script_name}: {e}")
        return False

print("=" * 75)
print("🎓 UNIVERSITY OF PHAYAO SOCIAL LISTENING PLATFORM")
print("📊 MASTER 3-MODEL AI EVALUATION BENCHMARK")
print("=" * 75)

# 1. Model 1: Typhoon 2.5
m1_status = run_script("MODEL 1: Typhoon 2.5 LLM Evaluation", "evaluate_typhoon.py")

# 2. Model 2: WangchanBERTa
m2_status = run_script("MODEL 2: WangchanBERTa Multi-Label Classification", "evaluate_wangchanberta.py")

# 3. Model 3: Sentence-BERT (SBERT)
m3_status = run_script("MODEL 3: Sentence-BERT Zero-Click Similarity", "evaluate_sbert.py")

print("\n" + "=" * 75)
print("🏆 MASTER AI EVALUATION SUMMARY DASHBOARD")
print("=" * 75)
print(f"1. Model 1: Typhoon 2.5 (Text Refine / Moderation / 5W1H) -> {'PASSED ✅' if m1_status else 'FAILED ❌'}")
print(f"2. Model 2: WangchanBERTa Multi-Label (8 Categories)    -> {'PASSED ✅' if m2_status else 'FAILED ❌'}")
print(f"3. Model 3: Sentence-BERT (SBERT Zero-Click Similarity)  -> {'PASSED ✅' if m3_status else 'FAILED ❌'}")
print("=" * 75)
print("🎉 All model evaluation routines are ready for graduation project submission!")
print("=" * 75)
