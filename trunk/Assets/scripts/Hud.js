#pragma strict

import GUIControls;

var colorCircle : Texture2D;
var col : Color = Color.white;
var selGridInt : int = 0;
var selStrings : String[] = ["3", "4", "5", "6", "7", "8"];
var vSliderValue : float = 0.0;// The variable to control where the scrollview 'looks' into its child elements.
var scrollPosition : Vector2;

function OnGUI ()
{
	var hudPanelHeight : int = 200;
	var xOffset : int = hudPanelHeight;
	var yOffset : int = Screen.height-hudPanelHeight;
	var longString = "This is a long-ish string";
	
	GUILayout.BeginArea(Rect(0, yOffset, hudPanelHeight, hudPanelHeight));
		col = RGBCircle(col, "", colorCircle);
	GUILayout.EndArea();
	
	xOffset += 20;
	selGridInt = GUI.SelectionGrid(Rect(xOffset, yOffset, 150, hudPanelHeight), selGridInt, selStrings, 2);
	
	xOffset += 160;
	vSliderValue = GUI.VerticalSlider(Rect(xOffset, yOffset+10, 30, hudPanelHeight-20), vSliderValue, 10.0, 0.0);
	
	xOffset += 40;
    // Begin a scroll view. All rects are calculated automatically - 
    // it will use up any available screen space and make sure contents flow correctly.
    // This is kept small with the last two parameters to force scrollbars to appear.
    
	GUILayout.BeginArea(Rect(xOffset, yOffset, 300, hudPanelHeight));	    
	    scrollPosition = GUILayout.BeginScrollView(scrollPosition, GUILayout.Width(300), GUILayout.Height(hudPanelHeight));
	    
		    // We just add a single label to go inside the scroll view. Note how the
		    // scrollbars will work correctly with wordwrap.
		    GUILayout.Label(longString);
		    GUILayout.Button("GET FUCKED!",GUILayout.Width(50), GUILayout.Height(50));
		    GUILayout.Label("GET FUCKED!");
		    GUILayout.Label("GET FUCKED!");
		    GUILayout.Label("GET FUCKED!");
		    GUILayout.Label("GET FUCKED!");
		    GUILayout.Label("GET FUCKED!");
		    
		    // Add a button to clear the string. This is inside the scroll area, so it
		    // will be scrolled as well. Note how the button becomes narrower to make room
		    // for the vertical scrollbar
		    if (GUILayout.Button("Clear"))
		        longString = "";
	    
	    // End the scrollview we began above.
	    GUILayout.EndScrollView();	    
	GUILayout.EndArea();
}