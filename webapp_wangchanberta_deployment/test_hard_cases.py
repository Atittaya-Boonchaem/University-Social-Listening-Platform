from complaint_classifier import ComplaintClassifier

clf = ComplaintClassifier('model')
test_cases = [
    ('ต่ออยู่แต่เปิดอะไรไม่ได้เลย', 'network'),
    ('ขีดเต็มแต่หน้าเว็บหมุนไม่หยุด', 'network'),
    ('วันนี้เรียนที่ ICT สัญญาณขึ้นปกติ แต่พอกดส่งงานแล้วค้างจนหมดเวลาส่ง', 'network, education'),
    ('ข้าวร้านนี้แพงขึ้นเยอะมาก', 'other'),
    ('นั่งเรียนอยู่แล้วมีเศษปูนจากฝ้าเพดานตกลงมาใกล้โต๊ะ', 'facilities, safety'),
    ('น้ำจากเครื่องปรับอากาศหยดใส่พื้นจนเกิดแอ่งตรงทางเดิน', 'facilities, safety'),
    ('รถไม่มาเกือบครึ่งชั่วโมงแล้ว คนรอเต็มป้าย', 'traffic'),
    ('ทางกลับหอมืดมาก มองแทบไม่เห็น', 'safety'),
    ('ตารางสอบสองวิชาชนเวลาเดียวกัน', 'education'),
    ('เมนูเขียนราคาอย่างหนึ่ง แต่ตอนคิดเงินเป็นอีกราคา', 'other'),
]

for text, expected in test_cases:
    res = clf.predict(text, decision_threshold=0.50)
    print(f"Text: {text}")
    print(f"  Expected: {expected}")
    print(f"  Predicted: {res['final_labels']}")
    print(f"  Scores: {res['shown_scores']}")
    print("-" * 50)
