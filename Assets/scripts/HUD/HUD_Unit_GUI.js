#pragma strict

import HUD_Widgets;


static var selectedColor : Color = Color.white;
static var selectedSize  : float = 0.0;
static var selectedSides : int = 0;

var selStrings : String[] = ["3", "4", "5", "6", "7", "8"];
var scrollPosition : Vector2;
var colorCircle : Texture2D;
var HUD_Unit_PreviewCamera : GameObject;

function Start()
{
	HUD_Unit_PreviewCamera = GameObject.Find("HUD_Unit_PreviewCamera");
}

function OnGUI ()
{
	var hudPanelHeight : int = 200;
	var xOffset : int = hudPanelHeight;
	var yOffset : int = Screen.height-hudPanelHeight;
	
	// Color wheel
	GUILayout.BeginArea(Rect(0, yOffset, hudPanelHeight, hudPanelHeight));
		selectedColor = RGBCircle(selectedColor, "", colorCircle);
	GUILayout.EndArea();
	
	// Button Grid
	xOffset += 20;
	selectedSides = GUI.SelectionGrid(Rect(xOffset, yOffset, 150, hudPanelHeight), selectedSides, selStrings, 2);
	
	// Size slider
	xOffset += 160;
	selectedSize = GUI.VerticalSlider(Rect(xOffset, yOffset+10, 30, hudPanelHeight-20), selectedSize, 1.0, 0.0);

	// Move 3D preview to be in correct location
	xOffset += 20;
	HUD_Unit_PreviewCamera.camera.pixelRect = Rect(xOffset, 10, 180, hudPanelHeight-20);

	// Squad controls
	xOffset += 190;
	GUILayout.BeginArea(Rect(xOffset, yOffset+10, 50, hudPanelHeight));
    	GUILayout.BeginVertical("box");
		GUILayout.Button("New",GUILayout.Width(40), GUILayout.Height(40));
	    GUILayout.Button("Del",GUILayout.Width(40), GUILayout.Height(40));
	    GUILayout.Button("+",GUILayout.Width(40), GUILayout.Height(40));
	    GUILayout.Button("-",GUILayout.Width(40), GUILayout.Height(40));
	    GUILayout.EndVertical();		    		
	GUILayout.EndArea();
	
	// Squad inventory
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