import io
import csv
import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer

RAW_CSV_TEXT = """text,primary_category,secondary_categories,difficulty,expression_type,urgency_level
"ต่ออยู่แต่เปิดอะไรไม่ได้เลย","network","","hard","implicit","medium"
"ขีดเต็มแต่หน้าเว็บหมุนไม่หยุด","network","","hard","implicit","medium"
"Wi-Fi หอหลุดทุกห้านาที","network","","easy","explicit","medium"
"เข้า UP Account แล้วเด้งกลับหน้าเดิมตลอด","network","","medium","explicit","medium"
"วันนี้เรียนที่ ICT สัญญาณขึ้นปกติ แต่พอกดส่งงานแล้วค้างจนหมดเวลาส่ง","network","education","hard","multi_label","high"
"โหลดชีทอาจารย์ไม่ขึ้นเลย","network","education","medium","implicit","medium"
"เน็ตช้ามากกก เปิดไฟล์ไม่ได้","network","","easy","short","medium"
"ล็อกอินได้ แต่กดเมนูไหนก็ timeout","network","","medium","explicit","medium"
"ต่อสายแลนในห้องแลบแล้วเครื่องแจ้งว่าไม่มี connection ทั้งที่เมื่อวานยังใช้ได้","network","","medium","narrative","medium"
"อยู่ตึก CE แล้ววิดีโอเรียนสดหยุดเป็นช่วง ๆ เสียงขาดจนตามเนื้อหาไม่ทัน","network","education","hard","multi_label","medium"
"หน้าเว็บมหาลัยเข้าไม่ได้ตั้งแต่เช้า","network","","easy","explicit","medium"
"ส่งแบบฟอร์มไปแล้วขึ้น error ตอนกดยืนยัน","network","","medium","implicit","medium"
"ระบบหมุนค้างตอนเลือกวิชาจนลงทะเบียนต่อไม่ได้","education","network","hard","multi_label","high"
"เล่นเว็บอื่นได้ปกติ แต่ระบบนักศึกษาเปิดไม่ขึ้น","network","","hard","implicit","medium"
"ห้อง PKY นั่งกันหลายคนแล้ว connection หลุดพร้อมกันหมด","network","","medium","narrative","medium"
"ฝนตกแล้วน้ำซึมจากขอบหน้าต่างเข้าห้องเรียน","facilities","","easy","explicit","medium"
"ปลั๊กโต๊ะกลุ่มนี้ใช้ไม่ได้ทุกช่อง","facilities","","easy","explicit","medium"
"กดลิฟต์แล้วประตูไม่ยอมเปิด","facilities","","medium","implicit","high"
"แอร์ห้องนี้เปิดแล้วแต่มีแต่ลมร้อน","facilities","","medium","implicit","medium"
"ตึก ICT น้ำหยดที่ชั้น 2","facilities","","hard","short","medium"
"ประตูห้องน้ำปิดไม่ได้ กลอนหลุดออกมาแล้ว","facilities","","easy","explicit","medium"
"นั่งเรียนอยู่แล้วมีเศษปูนจากฝ้าเพดานตกลงมาใกล้โต๊ะ","facilities","safety","hard","multi_label","high"
"ก๊อกตรงอ่างล้างมือหมุนแล้วน้ำไม่หยุดไหล","facilities","","medium","implicit","medium"
"ไฟในห้องดับไปครึ่งแถว ทำให้มองกระดานไม่ค่อยเห็น","facilities","education","medium","multi_label","medium"
"เก้าอี้ตัวหนึ่งโยกแรงมาก เหมือนขาจะหลุด","facilities","safety","medium","multi_label","high"
"บานกระจกตรงทางเข้าแตกร้าวยาวขึ้นเรื่อย ๆ","facilities","safety","medium","multi_label","high"
"ชักโครกกดไม่ลงแล้วน้ำเอ่อ","facilities","cleaning","medium","multi_label","high"
"ฝ้าเหนือทางเดินโป่งลงมาเหมือนมีน้ำขังอยู่ข้างบน","facilities","safety","hard","implicit","high"
"ที่เสียบชาร์จข้างห้องสมุดไม่มีไฟเข้า","facilities","","medium","implicit","low"
"เครื่องกดน้ำทำงานแต่ไม่มีน้ำออก","facilities","","medium","implicit","low"
"พื้นเหนียวเหมือนไม่ได้ถูหลายวัน","cleaning","","medium","implicit","medium"
"ถังขยะหน้าหอเต็มจนล้นออกมาข้างนอก","cleaning","","easy","explicit","medium"
"หน้าห้อง ICT มีขยะกองเต็ม","cleaning","","medium","explicit","medium"
"ห้องน้ำกลิ่นแรงมาก เข้าแทบไม่ได้","cleaning","","medium","implicit","medium"
"โต๊ะมีคราบอาหารเก่าเต็มเลย","cleaning","","easy","short","low"
"ใต้บันไดมีถุงขยะทิ้งสะสมจนเริ่มมีแมลง","cleaning","","medium","narrative","medium"
"น้ำจากท่อรั่วออกมาจนพื้นเลอะเป็นทางยาว ฝากช่วยซ่อมและเก็บพื้นที่ด้วย","facilities","cleaning","hard","multi_label","medium"
"หลังงานกิจกรรมเมื่อคืน บริเวณอ่างหลวงมีแก้วกับกล่องอาหารทิ้งไว้เยอะมาก","cleaning","","medium","narrative","low"
"อ่างล้างมือมีคราบดำกับกลิ่นเหม็นเหมือนไม่ได้ล้างมาหลายวัน","cleaning","","medium","explicit","medium"
"เจอแมลงสาบหลายตัวตรงจุดทิ้งเศษอาหาร","cleaning","","medium","implicit","medium"
"ทางเดินเปื้อนโคลนยาวตั้งแต่หน้าประตูถึงโถง","cleaning","","easy","explicit","low"
"ห้องเรียนมีเศษกระดาษกับขวดน้ำเหลืออยู่เต็มหลังเลิกคลาสก่อนหน้า","cleaning","","medium","narrative","low"
"น้ำรั่วจากฝ้าแล้วทิ้งคราบน้ำสกปรกเต็มพื้น","facilities","cleaning","hard","multi_label","medium"
"เศษแก้วแตกยังไม่ได้เก็บตรงทางเดิน","cleaning","safety","hard","multi_label","high"
"โต๊ะโรงอาหารเหนียวทุกตัวแถวนี้","cleaning","","easy","short","low"
"รถไม่มาเกือบครึ่งชั่วโมงแล้ว คนรอเต็มป้าย","traffic","","medium","narrative","medium"
"รถรอบเช้าเต็มตั้งแต่ต้นทาง ขึ้นไม่ได้เลย","traffic","","easy","explicit","medium"
"หาที่จอดวนสามรอบก็ยังไม่มีช่องว่าง","traffic","","medium","implicit","low"
"หน้าประตู 1 รถต่อแถวยาวจนเข้าเรียนสาย","traffic","education","hard","multi_label","medium"
"รถรับส่งมาช้ากว่าตารางเยอะมาก","traffic","","easy","explicit","medium"
"รอ bus นานมาก","traffic","","easy","short","low"
"ช่วงเย็นรถออกจากมหาลัยติดอยู่ตรงแยกนานทุกวัน","traffic","","medium","narrative","low"
"คนต่อคิวขึ้นรถเยอะ แต่มีรถมาแค่คันเดียว","traffic","","medium","implicit","medium"
"รถผ่านหน้า ICT เร็วมากจนคนข้ามถนนต้องหยุดหลบ","traffic","safety","hard","multi_label","high"
"ทางเข้าหอมีรถจอดซ้อนคันจนรถคันอื่นผ่านไม่ได้","traffic","","medium","explicit","medium"
"วันนี้รถเที่ยวสุดท้ายออกก่อนเวลาที่แจ้งไว้ เลยกลับหอไม่ได้","traffic","","hard","narrative","medium"
"รถติดหน้าประตู 2 เพราะมีรถจอดกีดขวางช่องทาง","traffic","","medium","implicit","medium"
"รถสองแถวเต็มทุกคันช่วงเลิกเรียน รอนานเกือบชั่วโมง","traffic","","medium","narrative","medium"
"ที่จอดมอไซค์แถว EN แน่นมากจนต้องเอาไปจอดไกล","traffic","","easy","explicit","low"
"รถบัสเบรกแรงหลายครั้งตอนคนยังยืนอยู่บนรถ","traffic","safety","hard","multi_label","high"
"ทางกลับหอมืดมาก มองแทบไม่เห็น","safety","","hard","implicit","high"
"ฝาท่อเปิดค้างอยู่ตรงทางเดิน","safety","","medium","short","high"
"พื้นต่างระดับตรงนี้สะดุดเกือบล้มหลายรอบแล้ว","safety","","medium","narrative","high"
"ไฟตรงลานจอดรถดับหมด ตอนกลางคืนไม่ค่อยกล้าเดินคนเดียว","safety","facilities","hard","multi_label","high"
"มีสายไฟหลุดห้อยลงมาใกล้ทางเดิน","safety","facilities","hard","explicit","high"
"น้ำหยดจากเพดานจนพื้นลื่นมาก","facilities","safety","hard","multi_label","high"
"รถขับกันเร็วตรงทางข้าม กลัวชนคน","traffic","safety","hard","multi_label","high"
"แผ่นเหล็กตรงพื้นเผยอขึ้นมา ปลายคมมาก","safety","facilities","hard","implicit","high"
"กิ่งไม้ใหญ่หักค้างอยู่เหนือทางเดิน","safety","","medium","implicit","high"
"มีคนเกือบล้มตรงบันไดเพราะขั้นหนึ่งแตก","facilities","safety","hard","multi_label","high"
"ตอนลงจากรถมีมอเตอร์ไซค์แทรกเข้ามาเร็วมาก เกือบชนกันตรงป้าย","traffic","safety","hard","narrative","high"
"ประตูหนีไฟมีของวางขวางเต็มทาง","safety","","medium","explicit","high"
"ราวกันตกตรงชั้นบนโยกได้เวลาเอามือจับ","safety","facilities","hard","implicit","high"
"พื้นเปียกแต่ไม่มีป้ายเตือน เกือบลื่นล้ม","safety","cleaning","hard","multi_label","high"
"มุมทางเดินหลัง UB มืดสนิทตั้งแต่หัวค่ำ","safety","facilities","medium","implicit","high"
"รายวิชาที่ต้องลงไม่ขึ้นให้เลือกในระบบ","education","network","hard","multi_label","high"
"ตารางสอบสองวิชาชนเวลาเดียวกัน","education","","easy","explicit","high"
"ยังไม่รู้ว่าทุนรอบนี้ประกาศผลวันไหน","education","","easy","explicit","low"
"คะแนนงานที่ส่งไปแล้วไม่แสดงในรายวิชา","education","","medium","implicit","medium"
"ขอเอกสารรับรองไปหลายวันแล้วยังไม่ได้รับ","education","","medium","narrative","medium"
"ถอนวิชาไม่ทันเพราะหน้าเว็บค้างตรงขั้นตอนยืนยัน","education","network","hard","multi_label","high"
"ชื่อหายจากรายวิชาที่เรียนอยู่ทั้งที่ลงทะเบียนและชำระเงินแล้ว","education","","medium","narrative","high"
"ตารางเรียนเปลี่ยนแต่ไม่มีแจ้งในระบบ ทำให้ไปผิดห้อง","education","network","hard","multi_label","medium"
"ยังไม่ได้รับเงินทุนรอบนี้ ทั้งที่สถานะขึ้นว่าอนุมัติแล้ว","education","","medium","implicit","medium"
"เอกสารจบต้องยื่นตรงไหนครับ","education","","easy","short","low"
"อาจารย์แจ้งว่ามีชื่อสอบ แต่ในระบบของนักศึกษาไม่ขึ้นรายวิชานี้","education","network","hard","multi_label","high"
"ลงทะเบียนครบแล้วแต่ยอดหน่วยกิตรวมแสดงไม่ตรง","education","network","hard","explicit","medium"
"เจ้าหน้าที่แจ้งให้แก้ข้อมูลคำร้อง แต่ไม่เห็นเมนูสำหรับแก้ไขในหน้าเว็บ","education","network","hard","multi_label","medium"
"ประกาศห้องสอบในเอกสารกับหน้าระบบเป็นคนละห้อง ไม่แน่ใจว่าต้องไปที่ไหน","education","network","hard","narrative","high"
"ผลการยื่นคำร้องสถานะค้างที่รอตรวจสอบมาหลายสัปดาห์","education","","medium","narrative","medium"
"ข้าวร้านนี้แพงขึ้นเยอะมาก","other","","easy","explicit","low"
"เพลงจากงานหน้าหอดังจนอ่านหนังสือไม่ได้","other","","medium","narrative","medium"
"มีหมาจรหลายตัวมาไล่รถตรงหน้าหอ","other","","medium","explicit","medium"
"พนักงานร้านพูดจาไม่ค่อยดีใส่ลูกค้า","other","","medium","narrative","low"
"อาหารที่ซื้อมาเหมือนยังไม่สุก","other","","medium","implicit","medium"
"แมวเข้ามานอนในห้องอ่านหนังสือบ่อยมาก","other","","hard","implicit","low"
"ราคาอาหารกับปริมาณไม่ค่อยสมเหตุสมผลเลย","other","","medium","implicit","low"
"เสียงซ้อมดนตรีดึกมาก นอนไม่ได้","other","","easy","short","medium"
"มีคนสูบบุหรี่ตรงจุดที่คนเดินผ่านเยอะ กลิ่นเข้าตลอด","other","","medium","explicit","medium"
"ร้านปิดก่อนเวลาที่ติดประกาศไว้หลายครั้งแล้ว","other","","medium","narrative","low"
"เจออาหารหมดอายุวางขายในร้าน","other","","easy","explicit","high"
"ช่วงพักเที่ยงคิวร้านอาหารยาวมากแต่เปิดขายแค่ช่องเดียว","other","","hard","narrative","low"
"เสียงประกาศจากลำโพงดังมากจนคุยกันแทบไม่ได้","other","","medium","implicit","low"
"มีนกเข้ามาทำรังตรงระเบียงและส่งเสียงตั้งแต่เช้า","other","","hard","narrative","low"
"เมนูเขียนราคาอย่างหนึ่ง แต่ตอนคิดเงินเป็นอีกราคา","other","","medium","explicit","medium"
"เข้าเรียนที่ ICT ปกติดีทุกอย่าง แต่ต่ออินเทอร์เน็ตแล้วใช้งานไม่ได้","network","","hard","narrative","medium"
"นั่งตรงอาคารสงวนแล้วเว็บโหลดช้ามาก ส่วนไฟกับอุปกรณ์ในห้องใช้ได้ปกติ","network","","hard","narrative","medium"
"หน้า CE มีเศษอาหารกับแก้วพลาสติกกองอยู่ ไม่ได้เกี่ยวกับอุปกรณ์ในตึก","cleaning","","hard","narrative","low"
"พื้นหน้าห้อง PKY มีคราบเหนียวจนรองเท้าติด","cleaning","","hard","implicit","medium"
"หน้าตึก EN มีรถจอดปิดทางออก ทำให้คันข้างในออกไม่ได้","traffic","","hard","implicit","medium"
"ข้ามถนนหน้า UB ยากมาก รถไม่ค่อยชะลอให้คนเดิน","traffic","safety","hard","implicit","high"
"ห้องเรียนเปิดแอร์เย็นปกติ แต่โปรเจกเตอร์ไม่ขึ้นภาพ","facilities","","hard","implicit","medium"
"Wi-Fi ใช้ได้ปกติ แต่ปลั๊กไฟทุกจุดในห้องไม่มีไฟ","facilities","","hard","narrative","medium"
"หน้าเว็บเข้าได้และใช้งานปกติ แต่รายวิชาที่อาจารย์แจ้งให้ลงไม่มีในแผนการเรียนของตัวเอง","education","","hard","narrative","medium"
"ระบบไม่ได้มีปัญหา เพียงแต่ยังไม่ทราบว่าต้องเตรียมเอกสารอะไรสำหรับยื่นทุน","education","","hard","narrative","low"
"สัญญาณเต็มทุกขีด แต่กดเปิดไฟล์ทีไรขึ้นวงกลมหมุนอย่างเดียว","network","","hard","implicit","medium"
"เรียนออนไลน์ได้ไม่ถึงสิบนาทีก็เด้งออก ต้องเข้าห้องใหม่ซ้ำ ๆ","network","education","hard","narrative","high"
"บันไดใช้เดินได้ แต่มีขั้นหนึ่งร้าวและยุบเวลาเหยียบ","facilities","safety","hard","implicit","high"
"น้ำจากเครื่องปรับอากาศหยดใส่พื้นจนเกิดแอ่งตรงทางเดิน","facilities","safety","hard","multi_label","high"
"ห้องน้ำสะอาดแต่ก๊อกตัวริมสุดหัก ใช้น้ำไม่ได้","facilities","","hard","narrative","medium"
"ไฟทางเดินติด ๆ ดับ ๆ เวลาเดินผ่านกลางคืนมองทางไม่ชัด","facilities","safety","hard","multi_label","high"
"ขยะไม่ได้เยอะ แต่กลิ่นจากถังแรงมากจนอยู่ใกล้ไม่ได้","cleaning","","hard","implicit","medium"
"หลังฝนหยุดมีดินโคลนติดเต็มพื้นทางเข้า คนเดินผ่านแล้วเลอะต่อกันไปหมด","cleaning","","hard","narrative","medium"
"รถมาถึงตรงเวลาแต่เต็มจนรับคนที่ป้ายนี้ไม่ได้","traffic","","hard","implicit","medium"
"รถยังมีที่นั่ง แต่ติดอยู่หน้าประตูมหาลัยนานจนไปเรียนไม่ทัน","traffic","education","hard","multi_label","medium"
"ตรงทางม้าลายไม่มีอะไรเสีย แต่รถส่วนใหญ่ไม่ยอมชะลอ","traffic","safety","hard","implicit","high"
"กลับหอตอนค่ำแล้วมีช่วงหนึ่งไม่มีแสงส่องทางเลย","safety","","hard","implicit","high"
"กระเบื้องไม่แตกแต่พื้นลื่นมากหลังมีคนทำน้ำหกไว้","safety","cleaning","hard","multi_label","high"
"เข้าเว็บได้ปกติและไม่ค้าง แต่ข้อมูลวันสอบที่ประกาศล่าสุดไม่ตรงกับเอกสารจากคณะ","education","","hard","narrative","high"
"กดส่งคำร้องแล้วขึ้นว่าสำเร็จ แต่กลับเข้ามาดูไม่พบรายการที่ส่งไว้","network","education","hard","multi_label","medium"
"อาหารรสชาติปกติ แต่กล่องที่ใช้ใส่มีรอยแตกจนซึมหกใส่กระเป๋า","other","","hard","narrative","low"
"มีเสียงเครื่องจักรจากงานก่อสร้างดังต่อเนื่องช่วงที่กำลังเรียน","other","education","hard","multi_label","medium"
"รถไม่ติด แต่ป้ายบอกเวลารอบถัดไปแสดงไม่ตรงกับรถที่มาจริง","traffic","","hard","implicit","low"
"หน้าห้องน้ำแห้งดี แต่ด้านในมีกลิ่นและคราบสะสมตามพื้น","cleaning","","hard","narrative","medium"
"เรียนอยู่แล้วไฟในห้องดับกะทันหันจนต้องหยุดคลาสกลางคัน","facilities","education","hard","multi_label","high"
"ประตูห้องเรียนล็อกเองจากด้านใน เปิดออกยากมากตอนคนอยู่เต็มห้อง","facilities","safety","hard","narrative","high"
"""

def main():
    # 1. Parse CSV
    new_df = pd.read_csv(io.StringIO(RAW_CSV_TEXT.strip()))
    print(f"Successfully parsed {len(new_df)} new hard/implicit complaint records.")
    
    # Save standalone benchmark file
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    benchmark_path = data_dir / "up_hard_cases_benchmark.csv"
    new_df.to_csv(benchmark_path, index=False, encoding="utf-8")
    print(f"Saved benchmark to {benchmark_path}")

    # 2. Load existing 7000 enterprise dataset
    enterprise_csv_path = Path("UP_Synthetic_Complaints_7000_Enterprise.csv")
    if enterprise_csv_path.exists():
        existing_df = pd.read_csv(enterprise_csv_path)
    else:
        existing_df = pd.DataFrame(columns=["text", "primary_category", "secondary_categories", "urgency_level"])

    # Combine datasets
    columns_to_keep = ["text", "primary_category", "secondary_categories", "urgency_level"]
    combined_df = pd.concat([existing_df[columns_to_keep], new_df[columns_to_keep]], ignore_index=True)
    # Deduplicate text
    combined_df = combined_df.drop_duplicates(subset=["text"]).reset_index(drop=True)
    total_records = len(combined_df)
    print(f"Combined Enterprise Dataset total samples: {total_records}")
    
    # Save updated Enterprise CSV
    combined_df.to_csv(enterprise_csv_path, index=False, encoding="utf-8")
    print(f"Updated {enterprise_csv_path} with {total_records} records.")

    # 3. Update up_complaints_data.json
    json_path = data_dir / "up_complaints_data.json"
    if json_path.exists():
        with open(json_path, "r", encoding="utf-8") as f:
            data_json = json.load(f)
    else:
        data_json = {
            "university": "University of Phayao",
            "version": "enterprise-augmented-2026",
            "categories": {cat: [] for cat in ['traffic', 'safety', 'cleaning', 'facilities', 'education', 'network', 'other']}
        }

    categories = ['traffic', 'safety', 'cleaning', 'facilities', 'education', 'network', 'other']
    # Add new records into corresponding category lists in json
    for _, row in new_df.iterrows():
        p_cat = str(row["primary_category"]).strip()
        t = str(row["text"]).strip()
        if p_cat in data_json["categories"]:
            if t not in data_json["categories"][p_cat]:
                data_json["categories"][p_cat].append(t)
    
    # Recount
    counts = {cat: len(data_json["categories"][cat]) for cat in categories}
    data_json["total_samples"] = sum(counts.values())
    data_json["category_counts"] = counts
    data_json["version"] = f"enterprise-{data_json['total_samples']}-records"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data_json, f, ensure_ascii=False, indent=2)
    print(f"Updated {json_path} - total samples: {data_json['total_samples']}, counts: {counts}")

    # 4. Rebuild enterprise_knowledge_index.pkl with Thai word segmentation
    import pythainlp
    print("Segmenting texts with pythainlp for optimal Thai semantic matching...")
    segmented_texts = [' '.join(pythainlp.tokenize.word_tokenize(t, engine='newmm')) for t in combined_df["text"]]
    
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)
    X = vectorizer.fit_transform(segmented_texts)

    centroids = {}
    for cat in categories:
        # Include rows where primary_category == cat OR secondary_categories contains cat (weighted!)
        is_primary = (combined_df['primary_category'] == cat).values
        is_secondary = combined_df['secondary_categories'].fillna("").apply(lambda s: cat in [x.strip() for x in str(s).split(",") if x.strip()]).values
        
        # We compute a weighted centroid: primary weight = 1.0, secondary weight = 0.8
        weights = np.zeros(len(combined_df))
        weights[is_primary] = 1.0
        weights[is_secondary] = np.maximum(weights[is_secondary], 0.8)
        
        if np.sum(weights) > 0:
            weighted_mean = np.asarray((X.T.multiply(weights)).sum(axis=1) / np.sum(weights)).squeeze()
            centroids[cat] = weighted_mean
        else:
            centroids[cat] = np.zeros(X.shape[1])

    knowledge_index = {
        'categories': categories,
        'vectorizer': vectorizer,
        'centroids': centroids,
        'total_samples': total_records,
        'tokenized': True
    }

    index_out = Path("model/enterprise_knowledge_index.pkl")
    with open(index_out, "wb") as f:
        pickle.dump(knowledge_index, f)
    print(f"Successfully recompiled and saved {index_out} (Size: {index_out.stat().st_size} bytes)")

if __name__ == "__main__":
    main()
