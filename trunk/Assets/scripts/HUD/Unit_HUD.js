#pragma strict

import HUD_Widgets;


static var selectedColor : Color = Color.white;
static var selectedSize  : float = 0.0;
static var selectedSides : int = 0;

var selStrings : String[] = ["3", "4", "5", "6", "7", "8"];
var scrollPosition : Vector2;
var colorCircle : Texture2D;

function OnGUI ()
{
	var hudPanelHeight : int = 200;
	var xOffset : int = hudPanelHeight;
	var yOffset : int = Screen.height-hudPanelHeight;
	
	GUILayout.BeginArea(Rect(0, yOffset, hudPanelHeight, hudPanelHeight));
		selectedColor = RGBCircle(selectedColor, "", colorCircle);
	GUILayout.EndArea();
	
	xOffset += 20;
	selectedSides = GUI.SelectionGrid(Rect(xOffset, yOffset, 150, hudPanelHeight), selectedSides, selStrings, 2);
	
	xOffset += 160;
	selectedSize = GUI.VerticalSlider(Rect(xOffset, yOffset+10, 30, hudPanelHeight-20), selectedSize, 2.0, 0.0);

	xOffset += 200;
	GUILayout.BeginArea(Rect(xOffset, yOffset+10, 50, hudPanelHeight));
    	GUILayout.BeginVertical("box");
		GUILayout.Button("New",GUILayout.Width(40), GUILayout.Height(40));
	    GUILayout.Button("Del",GUILayout.Width(40), GUILayout.Height(40));
	    GUILayout.Button("+",GUILayout.Width(40), GUILayout.Height(40));
	    GUILayout.Button("-",GUILayout.Width(40), GUILayout.Height(40));
	    GUILayout.EndVertical();		    		
	GUILayout.EndArea();
			
	xOffset += 60;
	GUILayout.BeginArea(Rect(xOffset, yOffset, 270, hudPanelHeight));	    
	    scrollPosition = GUILayout.BeginScrollView(scrollPosition, GUILayout.Width(245), GUILayout.Height(hudPanelHeight));
	    	var i : int = 0;
	    	for (i=0; i<10; i++)
	    	{
		    	GUILayout.BeginHorizontal("box");
				GUILayout.Button("SQ1"+i,GUILayout.Width(50), GUILayout.Height(50));
			    GUILayout.Button("SQ2"+i,GUILayout.Width(50), GUILayout.Height(50));
			    GUILayout.Button("SQ3"+i,GUILayout.Width(50), GUILayout.Height(50));
			    GUILayout.Button("SQ4"+i,GUILayout.Width(50), GUILayout.Height(50));
			    GUILayout.EndHorizontal();		    
	    	}
	    GUILayout.EndScrollView();	    
	GUILayout.EndArea();
}