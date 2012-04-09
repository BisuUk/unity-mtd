#pragma strict
#pragma downcast

var color : Color;
var range : float = Tower.baseRange;
var fov : float = Tower.baseFOV;
var buildTime : float = 1.0;
var baseDamage : int = 10;
var targetingBehavior : int = 1;
var fireRate : float = 0.5;
var recoilDistance : float = 0.3;
var recoilRecoverSpeed : float = 0.03;
var defaultMaterial: Material;
var constructingMaterial : Material;
var lineRenderer : LineRenderer;
var infoPlane : Transform;
var barrelLeft : Transform;
var barrelRight : Transform;
var laserPulsePrefab : Transform;
var netView : NetworkView;
var AOEMeshFilter : MeshFilter;
var AOEMeshRender: MeshRenderer;
var AOEObject : Transform;

private var isConstructing : boolean = false;
private var constructionDuration : float;
private var startConstructionTime : float = 0.0;
private var endConstructionTime : float = 0.0;
private var origRotation : Quaternion;
private var target : GameObject;
private var laserPulse : Transform;
private var nextFireTime : float;
private var lastBarrelFired : Transform;
private var origBarrelOffset : float;
private var kills : int = 0;    // Stats
static private var playerData : PlayerData;



function Awake()
{
   lastBarrelFired = barrelRight;
   origBarrelOffset = lastBarrelFired.localPosition.z;

   if (playerData == null)
   {
      var gameObj : GameObject = GameObject.Find("GameData");
      playerData = gameObj.GetComponent(PlayerData);
   }

   AOEMeshRender.material = new Material(Shader.Find("Transparent/Diffuse"));
   //AOEObject.parent = null;
}

function Initialize(data : InitData)
{
   origRotation = transform.rotation;
   AOEObject.parent = null; // Detach AOE mesh so that it doesn't rotate with the tower

   // Init on server, and then send init info to clients
   SetRange(data.range);
   SetFOV(data.fov);
   SetColor(data.color);
   netView.RPC("Init", RPCMode.Others, data.fov, data.range, data.color.r, data.color.g, data.color.b);

   // Start constructing visuals, and tell clients to do the same
   SetConstructing(buildTime);
   netView.RPC("SetConstructing", RPCMode.Others, buildTime);
}

@RPC
function Init(newFov : float, newRange : float, colorRed : float, colorGreen : float, colorBlue : float)
{
   origRotation = transform.rotation;
   AOEObject.parent = null; // Detach AOE mesh so that it doesn't rotate with the tower

   SetFOV(fov);
   SetRange(newRange);
   SetColor(Color(colorRed, colorGreen, colorBlue));
}

function Update()
{
   if (isConstructing)
   {
      // Animate model texture for that weird effect...
      var offsetx : float = Time.time * 5.0;
      var offsety : float = Time.time * 5.0;
      renderer.material.SetTextureOffset("_MainTex", Vector2(offsetx,offsety));
      for (var child : Transform in transform)
      {
         if (child != infoPlane && child != AOEObject)
            child.renderer.material.SetTextureOffset("_MainTex", Vector2(offsetx,offsety));
      }

      // Animate clock gui texture
      infoPlane.transform.position = transform.position + (Camera.main.transform.up*1.1);  //+ (Camera.main.transform.right*0.75);
      var timerVal : float = (Time.time-startConstructionTime)/constructionDuration;
      infoPlane.renderer.material.SetFloat("_Cutoff", Mathf.InverseLerp(0, 1, timerVal));

      // Server checks completion time and informs clients
      if (Network.isServer && Time.time >= endConstructionTime)
      {
         SetConstructing(0.0);
         netView.RPC("SetConstructing", RPCMode.Others, 0.0);
      }
   }
   else // Not under construction, ready
   {
      // Server manages targeting behavior
      if (Network.isServer)
      {
         var targ : GameObject = FindTarget();
         if (targ)
         {
            transform.LookAt(targ.transform);
            target = targ;
   
            //  Fire if it's time
            if(Time.time >= nextFireTime)
            {
               Fire(target.transform.position);
               netView.RPC("Fire", RPCMode.Others, target.transform.position);
            }
         }
      }

      // Move gun barrels back into place from recoil
      if (lastBarrelFired.localPosition.z < origBarrelOffset)
         lastBarrelFired.localPosition.z += recoilRecoverSpeed;
      else if (lastBarrelFired.localPosition.z > origBarrelOffset)
         lastBarrelFired.localPosition.z = origBarrelOffset;
   }

   // If this tower is selected, draw FOV
   AOEMeshRender.enabled = (playerData.selectedTower == gameObject);
}


function SetRange(newRange : float)
{
   range = newRange;
   if (range < Tower.baseRange)
      range = Tower.baseRange;

   AOEObject.transform.localScale = Vector3.one*range;
}


function SetColor(newColor : Color)
{
   color = newColor;
   renderer.material.color = color;
   for (var child : Transform in transform)
   {
      if (child != infoPlane && child != AOEObject)
         child.renderer.material.color = color;
   }
   AOEMeshRender.material.color = color;
   AOEMeshRender.material.color.a = 0.3;
}


function SetFOV(newFOV : float)
{
   fov = newFOV;
   SetAOEMesh(newFOV);
}

private var lastAOE = -1;
function SetAOEMesh(newAOE : float)
{
   if (lastAOE != newAOE)
   {
      AOEMeshFilter.mesh = Tower.CreateAOEMesh(newAOE, 1.0);
      lastAOE = newAOE;
   }
}


@RPC
function SetConstructing(duration : float)
{
   isConstructing = (duration > 0.0);

   if (isConstructing)
   {
      origRotation = transform.rotation; //set here for clients
      constructionDuration = duration;
      startConstructionTime = Time.time;
      endConstructionTime = Time.time + constructionDuration;
      infoPlane.renderer.enabled = true;

      // Set model texture for that weird effect...
      renderer.material = constructingMaterial;
      renderer.material.SetColor("_TintColor", color);
      for (var child : Transform in transform)
      {
         if (child != infoPlane && child != AOEObject)
         {
            child.renderer.material = constructingMaterial;
            child.renderer.material.SetColor("_TintColor", color);
         }
      }

      AOEMeshRender.material.color = color;
      AOEMeshRender.material.color.a = 0.3;
   }
   else
   {
      constructionDuration = 0.0;
      startConstructionTime = 0.0;
      endConstructionTime = 0.0;
      infoPlane.renderer.enabled = false;
      // Render normally - no build effect
      renderer.material = defaultMaterial;
      renderer.material.color = color;
      for (var child : Transform in transform)
      {
         if (child != infoPlane && child != AOEObject)
         {
            child.renderer.material = defaultMaterial;
            child.renderer.material.color = color;
         }
      }
   }
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
      var unitHealth : int = obj.GetComponent(Unit).health;
      if (unitHealth > 0)
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
               // Check if object is in line of sight
               //var mask = (1 << 10); // BLOCKS
               //if (Physics.Linecast(transform.position, obj.transform.position, mask)==false)
               //{
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
               //}
            }
         }
      }
   }
   return targ;
}

@RPC
function Fire(targetLocation : Vector3)
{
   lastBarrelFired = (lastBarrelFired==barrelLeft) ? barrelRight : barrelLeft;
   
   var pulse : Transform = Instantiate(laserPulsePrefab, transform.position, Quaternion.identity);
   var tpl : TowerPulseLaser = pulse.gameObject.GetComponent(TowerPulseLaser);
   tpl.muzzlePosition = lastBarrelFired.transform.position;
   tpl.targetPosition = targetLocation;
   tpl.laserColor = color;

   // Recoil barrel
   lastBarrelFired.localPosition.z -= recoilDistance;

   // Set next time to fire
   nextFireTime  = Time.time + fireRate;

   // Owner will apply damage to unit
   if (Network.isServer)
   {
      var tUnit : Unit = target.GetComponent(Unit);
      var rDmg : float = (0.3333 * (1.0 - Mathf.Abs(color.r-tUnit.color.r)));
      var gDmg : float = (0.3333 * (1.0 - Mathf.Abs(color.g-tUnit.color.g)));
      var bDmg : float = (0.3333 * (1.0 - Mathf.Abs(color.b-tUnit.color.b)));
      //Debug.Log("TowerPulse:Fire: rDmg="+rDmg+" gDmg="+gDmg+" bDmg="+bDmg);
      var dmg : int = baseDamage * (rDmg + gDmg + bDmg);
   
      //if (tUnit.DoDamage(dmg, color) == false)
      tUnit.DoDamage(dmg, color.r, color.g, color.b);
      //kills += 1;
   }
}


function OnMouseDown()
{
   playerData.selectedTower = gameObject;
}


function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}

function OnDestroy()
{
   if (AOEObject)
      Destroy(AOEObject);
}

function OnNetworkInstantiate(info : NetworkMessageInfo)
{
   // Network instantiated, turn on netview
   netView.enabled = true;
}


function OnSerializeNetworkView(stream : BitStream, info : NetworkMessageInfo)
{
   //var pos : Vector3 = transform.position;
   //stream.Serialize(pos);
   var rot : Quaternion = transform.localRotation;
   stream.Serialize(rot);

   if (stream.isWriting)
   {

   }
   else
   {
      transform.localRotation = rot;
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