#pragma strict
#pragma downcast

static var manaTextColor : Color = Color(0.6,0.6,1.0);
static var creditsTextColor : Color = Color(0.2,1.0,0.2);
static var colorOrange : Color = Color(1.0, 0.5, 0.0, 1.0);
static var colorYellow : Color = Color(1.0, 1.0, 0.0, 1.0);

static private var idGenerator : int = 0;

return Color(1.0, 0.5, 0.0, 1.0); // orange

enum TouchActionsType
{
   TOUCH_KILL,
   TOUCH_DAMAGE,
   TOUCH_COLOR_CHANGE,
   TOUCH_COLOR_MIX,
   TOUCH_REVERSE,
   TOUCH_PUZZLE_SCORE
}

// Returns normalized 1.0=Match; 0.0=Opposite (e.g. Red->Cyan)
static function ColorMatch(color1 : Color, color2 : Color) : float
{
   var sC : HSBColor = new HSBColor(color1);
   var eC : HSBColor = new HSBColor(color2);

   var p1 : Vector2 = (Vector2(Mathf.Cos(sC.h*360*Mathf.Deg2Rad), -Mathf.Sin (sC.h*360*Mathf.Deg2Rad)) * sC.s/2);
   var p2 : Vector2 = (Vector2(Mathf.Cos(eC.h*360*Mathf.Deg2Rad), -Mathf.Sin (eC.h*360*Mathf.Deg2Rad)) * eC.s/2);

   return (1.0-((p1-p2).magnitude));
}

static function GetMixColor(color1 : Color, color2 : Color) : Color
{
   if (color1 == Color.red)
   {
      if (color2 == colorYellow) // yellow
         return colorOrange; // orange
      else if (color2 == Color.blue)
         return Color.magenta;
      else
         return Color.red;
   }
   else if (color1 == colorYellow) // yellow
   {
      if (color2 == Color.red)
         return colorOrange; // orange
      else if (color2 == Color.blue)
         return Color.green;
      else
         return colorYellow; // yellow
   }
   else if (color1 == Color.blue)
   {
      if (color2 == Color.red)
         return Color.magenta;
      else if (color2 == colorYellow) // yellow
         return Color.green;
      else
         return Color.blue;
   }
   else
   {
      //var mix2 : Color = GetMixColor(color2, color1);
      //return (mix2 != color1) : mix2 : color1;
      return color1;
   }
   return color1;
}

// Intended for server side only!
static function GetUniqueID() : int
{
   idGenerator += 1;
   return idGenerator;
}

static function ClampAngle (angle : float, min : float, max : float)
{
 if (angle < -360)
    angle += 360;
 if (angle > 360)
    angle -= 360;
 return Mathf.Clamp (angle, min, max);
}


static function GetGroundAtPosition(newPos : Vector3, bumpUpFromGround : float) : Vector3
{
   // Checks camera collisions with terrain
   var retPos : Vector3 = newPos;
   var hit : RaycastHit;
   var mask : int = (1 << 10) | (1 << 4); // terrain & water

   var skyPoint : Vector3 = newPos;
   skyPoint.y = 25000;
   if (Physics.Raycast(skyPoint, Vector3.down, hit, Mathf.Infinity, mask))
   {
      // 5.0 is just a little pad, sometimes camera can see under steep hills
      var hpY : float = hit.point.y;

      if (hpY >= newPos.y)
      {
         var bumpUpPos : Vector3 = hit.point;
         bumpUpPos.y += bumpUpFromGround;
         return bumpUpPos;
      }
   }

   return retPos;
}

static function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t.renderer && t.renderer.material)
   {
      t.renderer.material.color = newColor;
      t.renderer.material.SetColor("_TintColor", newColor);
   }
   for (var child : Transform in t)
      SetChildrenColor(child, newColor);
}


static function ColorDiffValue(color1 : Color, color2 : Color) : float
{
// FIX ME - subtracting colors doesn't seem to work right
   var diffColor : Color = color1 - color2;
Debug.Log("ColorDiffValue:" + color1 + " d="+(diffColor.r + diffColor.g + diffColor.b));
   return Mathf.Abs(diffColor.r + diffColor.g + diffColor.b);
}

static function FindClosestBaseColor(color : Color) : Color
{
   var closest : float = 10.0;
   var closestColor : Color = Color.white;
   var val : float;

   val = ColorDiffValue(Color.red, color);
   if (val < closest)
   {
      closest = val;
      closestColor = Color.red;
   }

   val = ColorDiffValue(Utility.colorYellow, color); // yellow
   if (val < closest)
   {
      closest = val;
      closestColor = Utility.colorYellow;
   }

   val = ColorDiffValue(Color.blue, color);
   if (val < closest)
   {
      closest = val;
      closestColor = Color.blue;
   }

   val = ColorDiffValue(Color.green, color);
   if (val < closest)
   {
      closest = val;
      closestColor = Color.green;
   }

   val = ColorDiffValue(Color.magenta, color);
   if (val < closest)
   {
      closest = val;
      closestColor = Color.magenta;
   }

   val = ColorDiffValue(Utility.colorOrange, color);
   if (val < closest)
   {
      closest = val;
      closestColor = Utility.colorOrange;
   }

   return closestColor;
}
/*
static function CalculateTrajectory(
   start : Vector3,
   end : Vector3,
   speed : float)
{
   var targetTransform = start;
   var barrelTransform = end;
   
   var y = targetTransform.y - barrelTransform.y;
   
   //targetTransform.y = barrelTransform.y = 0;
   var xx = targetTransform.x - barrelTransform.x;
   var xz = targetTransform.z - barrelTransform.z;
   var x = Mathf.Sqrt(xx * xx + xz * xz);
   //var x = (targetTransform - barrelTransform).magnitude;
   var v = speed;
   var g = Physics.gravity.y;
   
   var sqrt = (v*v*v*v) - (g * (g * (x*x) + 2 * y * (v*v)));
   
   if (sqrt < 0)
   {
      Debug.Log("No Solution");
      return 0;
   }
   
   sqrt = Mathf.Sqrt(sqrt);
   
   var calculatedAnglePos = Mathf.Atan(((v*v) + sqrt) / (g*x));
   var calculatedAngleNeg = Mathf.Atan(((v*v) - sqrt) / (g*x));
   
   return calculatedAnglePos * Mathf.Rad2Deg;
}



static function CalculateTrajectory(
   start : Vector3,
   end : Vector3,
   speed : float,
   bUseHighArc : boolean) : Vector3
{
    var canHit : boolean  = false;

    // We use doubles instead of floats because we need a lot of
    // precision for some uses of the pow() function coming up.
    var term1 : double  = 0.0f;
    var term2 : double = 0.0f;
    var root : double  = 0.0f;

    var diffVector : Vector3 = end - start;

    // A horizontally-flattened difference vector.
    var horz : Vector3  = Vector3(diffVector.x, diffVector.y, 0.0);

    // We shrink our values by this factor to prevent too much
    // precision loss.
    var factor : float  = 1.0;
 
    // Remember that Unitize returns length
    var x : float = horz.magnitude / factor;
    var y : float = diffVector.y / factor;
    var v : float = speed / factor;
    var g : float = -Physics.gravity.y / factor;

   Debug.Log("gr="+Physics.gravity.y + " g="+g);

    term1 = Mathf.Pow(v, 4) - (g * ((g * Mathf.Pow(x,2)) + (2 * y * Mathf.Pow(v,2))));
 
    // If term1 is positive, then the 'end' point can be reached
    // at the given 'speed'.
    if ( term1 >= 0 )
    {
        canHit = true;
 
        term2 = Mathf.Sqrt(term1);

        var divisor : double = (g * x);
 
        if ( divisor != 0.0f )
        {
            if ( bUseHighArc )
            {
                root = ( Mathf.Pow(v,2) + term2 ) / divisor;
            }
            else
            {
                root = ( Mathf.Pow(v,2) - term2 ) / divisor;
            }
 
            root = Mathf.Atan(root) * Mathf.Rad2Deg;
 
            var angleOut : float = root;
            var rightVector : Vector3 = Vector3.Cross(horz, Vector3.up);
 
            // Rotate the 'horz' vector around 'rightVector' 
            // by '-angleOut' degrees.
            //RotatePointAroundAxis(rightVector, -angleOut, horz);
            horz = Quaternion.AngleAxis(-angleOut, rightVector) * horz;
        }
 
        // Now apply the speed to the direction, giving a velocity
        return (horz * speed);
    }
 
    //return canHit;
    return Vector3.zero;
}
*/

//----------------
// EFFECTS
//----------------
class Effect
{
   enum Types
   {
      EFFECT_HEALTH = 0,
      EFFECT_SPEED,
      EFFECT_COLOR,
      EFFECT_SHIELD,
      EFFECT_STOPGO
   };

   function Copy(copy : Effect)
   {
      type = copy.type;
      val = copy.val;
      color = copy.color;
      interval = copy.interval;
      expireTime = copy.expireTime;
      nextFireTime = copy.nextFireTime;
   }

   var type : int;
   var val : float;
   var color : Color;
   var interval : float;
   var expireTime : float;
   var nextFireTime : float;
};

