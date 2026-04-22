def calculate_stress(bpm, temperature):

    # Stress from heart rate
    if bpm < 40:
        heart_stress = 0
    elif bpm < 80:
        heart_stress = 1
    else:
        heart_stress = 2

    # Stress from temperature
    if temperature < 23:
        temp_stress = 0
    elif temperature < 25:
        temp_stress = 1
    else:
        temp_stress = 2

    # Combine scores
    score = heart_stress + temp_stress

    if score <= 1:
        return "calm"
    elif score <= 3:
        return "moderate"
    else:
        return "high"