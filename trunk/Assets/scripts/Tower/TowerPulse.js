#pragma strict
#pragma downcast


var color : Color;
var baseDamage : int = 10;
var range : float = Tower.baseRange;
var fov : float = Tower.baseFOV;
var buildTime : float = 1.0;
var targetingBehavior : int = 1;
var origRotation : Quaternion;
var buildStartTime : float = 0.0;
var player : PlayerData;
var kills : int = 0;    // Stats
static var fireRate : float = 0.5;
static var recoilRecoverDistance : float = 0.3;
static var recoilRecoverSpeed : float = 0.03;

private var lineRenderer : LineRenderer;
private var built : boolean = false;
private var target : GameObject;
private var laserPulse : Transform;
private var barrelLeft : Transform;
private var barrelRight : Transform;
private var nextFireTime : float;
private var lastBarrelFired : Transform;
private var origBarrelOffset : float;
private var origMaterial: Material;
private var infoPlane : Transform;
private static var laserPulsePrefab : Transform;
private static var buildMaterial : Material;

//InvokeRepeating("LaunchProjectile", 2, 0.3);

function Start()
{
   origMaterial = renderer.material;

   if (laserPulsePrefab==null)
      laserPulsePrefab = Resources.Load("prefabs/fx/TowerPulseLaserPrefab", Transform);
   if (buildMaterial==null)
      buildMaterial = Resources.Load("gfx/towerBuild", Material);

   renderer.material = buildMaterial;

   lineRenderer = GetComponent(LineRenderer);
   lineRenderer.material = new Material(Shader.Find("Particles/Additive"));
   for (var child : Transform in transform)
   {
      if (child.name == "BarrelLeft")
         barrelLeft = child;
      else if (child.name == "BarrelRight")
         barrelRight = child;
      else if (child.name == "InfoUI")
         infoPlane = child;
   }

   lastBarrelFired = barrelRight;
   origBarrelOffset = lastBarrelFired.localPosition.z;
}


function SetRange(newRange : float)
{
   range = newRange;
   if (range < Tower.baseRange)
      range = Tower.baseRange;
}

// Find the the closest unit
function FindClosestUnit() : GameObject
{
    // Find all game objects with tag Enemy
    var gos : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");
    var closest : GameObject; 
    var distance = Mathf.Infinity; 
    var position = transform.position; 
    // Iterate through them and find the closest one
    for (var go : GameObject in gos)
    {
        var diff = (go.transform.position - position);
        var curDistance = diff.sqrMagnitude; 
        if (curDistance < distance)
        {
            closest = go; 
            distance = curDistance; 
        }
    }
    return closest;    
}

function FindTarget()
{
   var targ : GameObject = null;
   var position = transform.position;
   var closestDist = Mathf.Infinity;
   var leastHealth = Mathf.Infinity;
   var bestColorDiff = 0;

   // Find all game objects with tag
   var objs : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");

   // Iterate through them and find the closest one
   for (var obj : GameObject in objs)
   {
      var diff = (obj.transform.position - position);
      var dist = diff.magnitude;
      // Check object is in range...
      if (dist <= range)
      {
         // Check if object is in FOV...
         var angle : float = Quaternion.Angle(Quaternion.LookRotation(diff), origRotation);
         if (Mathf.Abs(angle) <= fov/2.0)
         {
            // Target closest
            if (targetingBehavior == 0)
            {
               if (dist < closestDist)
               {
                  closestDist = dist;
                  targ = obj;
               }
            }
            // Target weakest
            else if (targetingBehavior == 1)
            {
               var unitHealth : int = obj.GetComponent(Unit).health;
               if (unitHealth < leastHealth)
               {
                  leastHealth = unitHealth;
                  targ = obj;
               }
            }
            // Target best color
            else if (targetingBehavior == 2)
            {
               var unitColor : Color = obj.GetComponent(Unit).color;
               var rDmg : float = (1.0 - Mathf.Abs(color.r-unitColor.r));
               var gDmg : float = (1.0 - Mathf.Abs(color.g-unitColor.g));
               var bDmg : float = (1.0 - Mathf.Abs(color.b-unitColor.b));
               var colorDiff = rDmg + gDmg + bDmg;
               if (colorDiff > bestColorDiff)
               {
                  bestColorDiff = colorDiff;
                  targ = obj;
               }
            }
         }
      }
   }
   return targ;
}

function Fire()
{
   lastBarrelFired = (lastBarrelFired==barrelLeft) ? barrelRight : barrelLeft;
   
   var pulse : Transform = Instantiate(laserPulsePrefab, transform.position, Quaternion.identity);
   var tpl : TowerPulseLaser = pulse.gameObject.GetComponent(TowerPulseLaser);
   tpl.muzzlePosition = lastBarrelFired.transform.position;
   tpl.targetPosition = target.transform.position;
   tpl.laserColor = renderer.material.color;

   // recoil
   lastBarrelFired.localPosition.z -= recoilRecoverDistance;

   // Set next time to fire
   nextFireTime  = Time.time + fireRate;

   // Apply damage to unit
   var tUnit : Unit = target.GetComponent(Unit);
   var rDmg : float = (0.3333 * (1.0 - Mathf.Abs(color.r-tUnit.color.r)));
   var gDmg : float = (0.3333 * (1.0 - Mathf.Abs(color.g-tUnit.color.g)));
   var bDmg : float = (0.3333 * (1.0 - Mathf.Abs(color.b-tUnit.color.b)));
   //Debug.Log("TowerPulse:Fire: rDmg="+rDmg+" gDmg="+gDmg+" bDmg="+bDmg);
   var dmg : int = baseDamage * (rDmg + gDmg + bDmg);

   if (tUnit.DoDamage(dmg, color) == false)
      kills += 1;
}

function Update()
{
   if (built)
   {
      var targ : GameObject = FindTarget();
      if (targ)
      {
         transform.LookAt(targ.transform);
         target = targ;
   
         //  Fire if it's time
         if( Time.time > nextFireTime )
            Fire();
      }

      // Move gun barrels back into place from recoil
      if (lastBarrelFired.localPosition.z < origBarrelOffset)
         lastBarrelFired.localPosition.z += recoilRecoverSpeed;
      else if (lastBarrelFired.localPosition.z > origBarrelOffset)
         lastBarrelFired.localPosition.z = origBarrelOffset;
   }
   else // not built, show building FX
   {
      built = (Time.time > buildStartTime + buildTime);

      // Do that weird effect on the tower while it's building...
      var offsetx : float = Time.time * 5.0;
      var offsety : float = Time.time * 5.0;
      var attrColor = (built) ? "_Color" : "_TintColor";
      renderer.material = (built) ? origMaterial : buildMaterial;
      renderer.material.SetColor(attrColor, color);
      renderer.material.SetTextureOffset("_MainTex", Vector2(offsetx,offsety));
      for (var child : Transform in transform)
      {
         if (child != infoPlane)
         {
            child.renderer.material = (built) ? origMaterial : buildMaterial;
            child.renderer.material.SetColor(attrColor, color);
            child.renderer.material.SetTextureOffset("_MainTex", Vector2(offsetx,offsety));
         }
      }

      // Show clock gui texture
      infoPlane.renderer.enabled = !built;
      if (infoPlane.renderer.enabled)
      {
         infoPlane.transform.position = transform.position + (Camera.main.transform.up*1.1);   //+ (Camera.main.transform.right*0.75);
         // Rotate plane where 1 rev = build time
         var rot : float = 360*((Time.time-buildStartTime)/buildTime);
         infoPlane.transform.Rotate(0,-rot,0, Space.Self);
      }
   }

   // If this tower is selected, draw FOV
   if (player.selectedTower == gameObject)
      DrawFOV();
   else
      lineRenderer.enabled = false;
}


function OnMouseDown()
{
   player.selectedTower = gameObject;
}

function DrawFOV()
{
   var stride : float = 10.0;
   var indexCounter : int = 1;
   var i : float = 0;
   var r : Quaternion;

   lineRenderer.enabled = true;
   lineRenderer.SetColors(renderer.material.color,renderer.material.color);
   lineRenderer.SetVertexCount(fov/stride+3);

   lineRenderer.SetPosition(0, transform.position);
   indexCounter = 1;
   for (i=-fov/2.0; i<=fov/2.0; i+=stride)
   {
      r = origRotation;
      r *= Quaternion.Euler(0, i, 0);
      lineRenderer.SetPosition(indexCounter, transform.position + (r*Vector3(0,0,1)*range));
      indexCounter += 1;
   }
   lineRenderer.SetPosition(indexCounter, transform.position);
}


function DrawRange()
{
   var stride : float = 10.0;
   var indexCounter : int = 1;
   var i : float = 0;
   var r : Quaternion;

   lineRenderer.enabled = true;
   lineRenderer.SetColors(renderer.material.color,renderer.material.color);
   lineRenderer.SetVertexCount(360.0/stride+1);
   indexCounter = 0;

   r = transform.rotation;
   for (i=0.0; i<=360.0; i+=stride)
   {
      r *= Quaternion.Euler(0, stride, 0);
      lineRenderer.SetPosition(indexCounter, transform.position + (r*Vector3(0,0,1)*range));
      indexCounter += 1;
   }
}





/*
// LIGHTNING BOLT EFFECT
var target : GameObject;
var LR : LineRenderer;
var arcLength = 2.0;
var arcVariation = 2.0;
var inaccuracy = 1.0;

function Update()
{

   var lastPoint = transform.position;
   var i = 1;
   LR.SetPosition(0, transform.position);//make the origin of the LR the same as the transform
   while (Vector3.Distance(target.transform.position, lastPoint) >.5)
   {
      //was the last arc not touching the target?
      LR.SetVertexCount(i + 1);//then we need a new vertex in our line renderer
      var fwd = target.transform.position - lastPoint;//gives the direction to our target from the end of the last arc
      fwd.Normalize();//makes the direction to scale
      fwd = Randomize(fwd, inaccuracy);//we don't want a straight line to the target though
      fwd *= Random.Range(arcLength * arcVariation, arcLength);//nature is never too uniform
      fwd += lastPoint;//point + distance * direction = new point. this is where our new arc ends
      LR.SetPosition(i, fwd);//this tells the line renderer where to draw to
      i++;
      lastPoint = fwd;//so we know where we are starting from for the next arc
   }

}

function Randomize (v3 : Vector3, inaccuracy2 : float)
{
   v3 += Vector3(Random.Range(-1.0, 1.0), Random.Range(-1.0, 1.0), Random.Range(-1.0, 1.0)) * inaccuracy2;
   v3.Normalize();
   return v3;
}
*/