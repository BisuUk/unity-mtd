#pragma strict


//----------------
// EFFECTS
//----------------
class Effect
{
   var type : int;
   var val : float;
   var color : Color;
   var interval : float;
   var expireTime : float;
   var nextFireTime : float;
};

// Returns normalized 1.0=Match; 0.0=Opposite (e.g. Red->Cyan)
static function ColorMatch(color1 : Color, color2 : Color) : float
{
   var sC : HSBColor = new HSBColor(color1);
   var eC : HSBColor = new HSBColor(color2);

   var p1 : Vector2 = (Vector2(Mathf.Cos(sC.h*360*Mathf.Deg2Rad), -Mathf.Sin (sC.h*360*Mathf.Deg2Rad)) * sC.s/2);
   var p2 : Vector2 = (Vector2(Mathf.Cos(eC.h*360*Mathf.Deg2Rad), -Mathf.Sin (eC.h*360*Mathf.Deg2Rad)) * eC.s/2);

   return (1.0-((p1-p2).magnitude));
}