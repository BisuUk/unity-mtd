
static function RGBSlider (c : Color, label : String) {
	GUI.color=c;
	GUILayout.Label (label);
	GUI.color=Color.red;
	c.r = GUILayout.HorizontalSlider (c.r,0,1);
	GUI.color=Color.green;
	c.g = GUILayout.HorizontalSlider (c.g,0,1);
	GUI.color=Color.blue;
	c.b = GUILayout.HorizontalSlider (c.b,0,1);
	GUI.color=Color.white;
	return c;
}

static function RGBCircle (c : Color, label : String, colorCircle : Texture2D)
{
	r = GUILayoutUtility.GetAspectRect(1);

	// Easier to work with HSB colors in this case
	hsb = new HSBColor(c); 
	center = Vector2 (r.x+r.width/2, r.y+r.height/2);
	
	if (Input.GetMouseButton(0))
	{
		var InputVector = Vector2.zero;
		InputVector.x = center.x - Event.current.mousePosition.x;
		InputVector.y = center.y - Event.current.mousePosition.y;
		
		hyp = Mathf.Sqrt( (InputVector.x * InputVector.x) + (InputVector.y * InputVector.y) );
		if (hyp <= r.width/2 + 5)
		{
			hyp = Mathf.Clamp(hyp,0,r.width/2);
			var a : float = Vector3.Angle(Vector3(-1,0,0), InputVector);
			
			if (InputVector.y<0)
			{
				a = 360 - a;
			}			
			hsb.h = a / 360;
			hsb.s = hyp / (r.width/2);
		}
	}

	hsb2 = new HSBColor(c);
	hsb2.b = 1;
	c2 = hsb2.ToColor();
	GUI.color = c2;
	//hsb.b = GUI.VerticalSlider(r2,hsb.b,1.0,0.0,"BWSlider","verticalsliderthumb");

//	GUI.color = Color.white * hsb.b;
	GUI.color = Color.white * 1;
	GUI.color.a = 1;
	GUI.Box(r, colorCircle, GUIStyle.none);
	
	// Calculate position of selection marker
	pos = (Vector2(Mathf.Cos(hsb.h*360*Mathf.Deg2Rad), -Mathf.Sin (hsb.h*360*Mathf.Deg2Rad)) * r.width*hsb.s/2);	
	GUI.color = c;
	GUI.Box(Rect(pos.x-5+center.x, pos.y-5+center.y, 10, 10), "");
	GUI.color = Color.white;
	
	c = hsb.ToColor();
	return c;
}