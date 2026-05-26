import matplotlib.pyplot as plt
import seaborn as sns

# სტილის გასუფთავება აკადემიური ფორმატისთვის
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.family'] = 'sans-serif'

# ---- ჩარტი 1: Feature Importance (ნიშან-თვისებების მნიშვნელოვნება) ----
features = ['avg_understanding', 'missed_homeworks', 'engagement_score']
importance = [0.680, 0.165, 0.154]

plt.figure(figsize=(8, 4))
colors = sns.color_palette("Blues_r", n_colors=3)
bars = plt.barh(features, importance, color=colors, edgecolor='gray', height=0.5)

# ციფრების დაწერა ბარებზე
for bar in bars:
    width = bar.get_width()
    plt.text(width + 0.01, bar.get_y() + bar.get_height()/2, f'{width:.3f}', 
             va='center', ha='left', fontsize=10, fontweight='bold')

plt.title('Feature Importance - Decision Tree Classifier', fontsize=12, fontweight='bold', pad=15)
plt.xlabel('Importance Score', fontsize=11)
plt.xlim(0, 0.8)
plt.gca().invert_yaxis()  # ყველაზე მნიშვნელოვანი ზემოთ რომ მოექცეს
plt.tight_layout()
plt.savefig('feature_importance.png', dpi=300) # ინახავს HD ხარისხში
plt.close()

# ---- ჩარტი 2: Class Distribution (სტუდენტების განაწილება) ----
labels = ['Easy', 'Medium', 'Hard', 'Complex']
counts = [106, 66, 68, 76]

plt.figure(figsize=(7, 4))
colors_dist = sns.color_palette("pastel", n_colors=4)
bars_dist = plt.bar(labels, counts, color=colors_dist, edgecolor='gray', width=0.6)

# ციფრების დაწერა სვეტებზე
for bar in bars_dist:
    yval = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2, yval + 2, f'{yval}', 
             va='bottom', ha='center', fontsize=10, fontweight='bold')

plt.title('Target Variable Distribution (difficulty_label)', fontsize=12, fontweight='bold', pad=15)
plt.ylabel('Number of Students', fontsize=11)
plt.xlabel('Difficulty Classes', fontsize=11)
plt.ylim(0, 120)
plt.tight_layout()
plt.savefig('class_distribution.png', dpi=300) # ინახავს HD ხარისხში
plt.close()

print("✅ ჩარტები წარმატებით დაგენერირდა: 'feature_importance.png' და 'class_distribution.png'")