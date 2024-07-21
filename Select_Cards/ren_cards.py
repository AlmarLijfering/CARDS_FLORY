import os

directory = 'C:\\Users\\almarlijfering\\OneDrive\\Python Code\\myenv\\Static\\images\\cards'
for count, filename in enumerate(os.listdir(directory), start=1):
    if filename.endswith(".JPG"):
        dst = f"cards_l{str(count).zfill(3)}.jpg"
        src = f"{directory}\\{filename}"
        dst = f"{directory}\\{dst}"
        os.rename(src, dst)
