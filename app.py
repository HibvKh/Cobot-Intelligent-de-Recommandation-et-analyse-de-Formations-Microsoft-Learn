import os
import pandas as pd
from flask import Flask, jsonify, send_from_directory, send_file, request
from flask_cors import CORS
import json # Import json module for json.dumps

app = Flask(__name__, 
            static_folder='.',
            template_folder='.')
CORS(app)

# Load the Excel data
excel_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'learn_data_with_popularity.xlsx')
df = pd.read_excel(excel_file_path)

@app.route('/')
def serve_dashboard():
    return render_template('dashboard2.html')

@app.route('/api/filters')
def get_filters():
    levels = df['Level'].unique().tolist()
    types = df['Type'].unique().tolist()
    return jsonify({"levels": levels, "types": types})

@app.route('/api/recommendations', methods=['GET', 'POST'])
def get_recommendations():
    # This endpoint will now handle both initial data load and filtered data
    # It expects filters in the request body for POST, or query params for GET (though script2.js uses POST)
    
    # For POST requests (from script2.js updateAnalytics)
    if request.method == 'POST':
        data = request.get_json()
        levels = data.get('levels_filter', [])
        types = data.get('types_filter', [])
    else: # For GET requests (if needed for direct access or initial load)
        levels = request.args.getlist('levels_filter')
        types = request.args.getlist('types_filter')

    filtered_df = df.copy()

    if levels:
        filtered_df = filtered_df[filtered_df['Level'].isin(levels)]

    if types:
        filtered_df = filtered_df[filtered_df['Type'].isin(types)]

    # Calculate key indicators
    total_items = len(filtered_df)
    total_duration_hours = filtered_df['duration_in_minutes'].sum() / 60
    avg_popularity = filtered_df['Popularity'].mean()
    
    # Assuming 'Certified' column exists and is boolean or 0/1
    # If not, adjust this line based on actual column name and data type
    certified_count = filtered_df[filtered_df['Certified'] == 1].shape[0] if 'Certified' in filtered_df.columns else 0
    percent_certified = (certified_count / total_items * 100) if total_items > 0 else 0

    # Prepare data for charts (example - adjust as needed for actual chart data)
    # Ensure chart data is JSON stringified as expected by script2.js
    charts_data = {}

    # Chart 1: Répartition par niveau
    levels_dist = filtered_df['Level'].value_counts().reset_index()
    levels_dist.columns = ['Level', 'Count']
    charts_data['chart1'] = json.dumps({
        "data": [{
            "x": levels_dist['Level'].tolist(),
            "y": levels_dist['Count'].tolist(),
            "type": "bar",
            "name": "Répartition par niveau"
        }],
        "layout": {
            "title": "Répartition par niveau",
            "xaxis": {"title": "Levels"},
            "yaxis": {"title": "Count"}
        }
    })

    # Chart 2: Répartition par type
    types_dist = filtered_df['Type'].value_counts().reset_index()
    types_dist.columns = ['Type', 'Count']
    charts_data['chart2'] = json.dumps({
        "data": [{
            "labels": types_dist['Type'].tolist(),
            "values": types_dist['Count'].tolist(),
            "type": "pie",
            "name": "Répartition par type"
        }],
        "layout": {
            "title": "Répartition par type"
        }
    })

    # Chart 3: Popularité moyenne par type
    popularity_by_type_data = filtered_df.groupby('Type')['Popularity'].mean().reset_index()
    popularity_by_type_data.columns = ['Type', 'Popularity']
    charts_data['chart3'] = json.dumps({
        "data": [{
            "x": popularity_by_type_data['Type'].tolist(),
            "y": popularity_by_type_data['Popularity'].tolist(),
            "type": "bar",
            "name": "Popularité moyenne par type"
        }],
        "layout": {
            "title": "Popularité moyenne par type",
            "xaxis": {"title": "Type"},
            "yaxis": {"title": "Popularity"}
        }
    })

    # Chart 4: Durée totale (min) par niveau
    duration_by_level_data = filtered_df.groupby('Level')['duration_in_minutes'].sum().reset_index()
    duration_by_level_data.columns = ['Level', 'duration_in_minutes']
    charts_data['chart4'] = json.dumps({
        "data": [{
            "x": duration_by_level_data['Level'].tolist(),
            "y": duration_by_level_data['duration_in_minutes'].tolist(),
            "type": "bar",
            "name": "Durée totale (min) par niveau"
        }],
        "layout": {
            "title": "Durée totale (min) par niveau",
            "xaxis": {"title": "Levels"},
            "yaxis": {"title": "duration_in_minutes"}
        }
    })

    # Chart 5: Top technologies (occurrences)
    all_technologies = filtered_df['Technology'].dropna().str.split(', ').explode()
    top_technologies_data = all_technologies.value_counts().head(10).reset_index()
    top_technologies_data.columns = ['Technology', 'Count']
    charts_data['chart5'] = json.dumps({
        "data": [{
            "x": top_technologies_data['Technology'].tolist(),
            "y": top_technologies_data['Count'].tolist(),
            "type": "bar",
            "name": "Top technologies (occurrences)"
        }],
        "layout": {
            "title": "Top technologies (occurrences)",
            "xaxis": {"title": "Technology"},
            "yaxis": {"title": "Count"}
        }
    })

    # Chart 6: Top sujets (occurrences)
    all_subjects = filtered_df['Subject'].dropna().str.split(', ').explode()
    top_subjects_data = all_subjects.value_counts().head(10).reset_index()
    top_subjects_data.columns = ['Subject', 'Count']
    charts_data['chart6'] = json.dumps({
        "data": [{
            "x": top_subjects_data['Subject'].tolist(),
            "y": top_subjects_data['Count'].tolist(),
            "type": "bar",
            "name": "Top sujets (occurrences)"
        }],
        "layout": {
            "title": "Top sujets (occurrences)",
            "xaxis": {"title": "Subject"},
            "yaxis": {"title": "Count"}
        }
    })

    return jsonify({
        "kpis": {
            "total_items": total_items,
            "total_duration_hours": round(total_duration_hours, 2),
            "avg_popularity": round(avg_popularity, 2),
            "certified_percentage": round(percent_certified, 2)
        },
        "charts": charts_data,
        "data_preview": filtered_df.head(5).to_dict(orient='records')
    })


@app.route('/test')
def test_route():
    return jsonify({"message": "Minimal Flask server is running!"})

if __name__ == "__main__":
    app.run(debug=True, port=5001, use_reloader=False)
