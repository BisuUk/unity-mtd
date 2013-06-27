#pragma strict
#pragma downcast

static var manaTextColor : Color = Color(0.6,0.6,1.0);
static var creditsTextColor : Color = Color(0.2,1.0,0.2);

static private var idGenerator : int = 0;


// Returns normalized 1.0=Match; 0.0=Opposite (e.g. Red->Cyan)
static function ColorMatch(color1 : Color, color2 : Color) : float
{
   var sC : HSBColor = new HSBColor(color1);
   var eC : HSBColor = new HSBColor(color2);

   var p1 : Vector2 = (Vector2(Mathf.Cos(sC.h*360*Mathf.Deg2Rad), -Mathf.Sin (sC.h*360*Mathf.Deg2Rad)) * sC.s/2);
   var p2 : Vector2 = (Vector2(Mathf.Cos(eC.h*360*Mathf.Deg2Rad), -Mathf.Sin (eC.h*360*Mathf.Deg2Rad)) * eC.s/2);

   return (1.0-((p1-p2).magnitude));
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

// Recurses
static function SetActiveRecursive(t : Transform, activate : boolean)
{
   // Manually control widgets that have underscores
   if (t.name.StartsWith("_"))
      return;
   t.gameObject.active = activate;
   for (var child : Transform in t)
      SetActiveRecursive(child, activate);
}

// Recurses
static function SetActiveRecursiveForce(t : Transform, activate : boolean)
{
   t.gameObject.active = activate;
   for (var child : Transform in t)
      SetActiveRecursiveForce(child, activate);
}

// Recurses
static function SetActiveRecursiveForceOnly(t : Transform, activate : boolean)
{
   if (t.name.StartsWith("_"))
      t.gameObject.active = activate;
   for (var child : Transform in t)
      SetActiveRecursiveForceOnly(child, activate);
}

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
      EFFECT_SHIELD
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

