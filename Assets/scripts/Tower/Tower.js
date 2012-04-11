#pragma strict
#pragma downcast

var range : float;
var fireRate : float;
var damage : float;
var fov : float;
var color : Color;
var cost : int;
var base : TowerAttributes;
var targetingBehavior : int = 1;
var isConstructing : boolean = false;
var origRotation : Quaternion;
var defaultMaterial: Material;
var constructingMaterial : Material;
var infoPlane : Transform;
var netView : NetworkView;
var AOEMeshFilter : MeshFilter;
var AOEMeshRender: MeshRenderer;
var AOE : Transform;
private var constructionDuration : float;
private var startConstructionTime : float = 0.0;
private var endConstructionTime : float = 0.0;
static private var playerData : PlayerData;

var kills : int = 0;    // Stats


function Awake()
{
   if (playerData == null)
   {
      var gameObj : GameObject = GameObject.Find("GameData");
      playerData = gameObj.GetComponent(PlayerData);
   }

   AOE.parent = null; // Detach AOE mesh so that it doesn't rotate with the tower
   AOEMeshRender.material = new Material(Shader.Find("Transparent/Diffuse"));

   // Set default attributes
   SetFOV(base.defaultFOV);
   SetRange(base.defaultRange);
   fireRate = base.defaultFireRate;
   damage = base.defaultDamage;
}

function Initialize(newRange : float, newFOV : float, newRate : float, newDamage : float, newColor : Color)
{
   origRotation = transform.rotation;


   SetFOV(newFOV);
   SetRange(newRange); // make sure this is done after detach, or scaling will be wrong
   SetColor(newColor);
   damage = newDamage;
   fireRate = newRate;

   Debug.Log("r="+newRange+" f="+newFOV+" fr="+newRate+" d="+newDamage);

   // Init on server, and then send init info to clients
   netView.RPC("Init", RPCMode.Others, newRange, newFOV, newColor.r, newColor.g, newColor.b);

   // Start constructing visuals, and tell clients to do the same
   SetConstructing(GetCurrentTimeCost());
   netView.RPC("SetConstructing", RPCMode.Others, GetCurrentTimeCost());
}

@RPC
function Init(newRange : float, newFOV : float, colorRed : float, colorGreen : float, colorBlue : float)
{
   Debug.Log("r="+newRange+" f="+newFOV);
   origRotation = transform.rotation;

   SetFOV(newFOV);
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
         if (child != infoPlane && child != AOE)
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

   // If this tower is selected, draw FOV
   AOEMeshRender.enabled = (playerData.selectedTower == gameObject);
}


function SetRange(newRange : float)
{
   range = newRange;
   AOE.transform.localScale = Vector3.one*(newRange);
}


function SetColor(newColor : Color)
{
   color = newColor;
   renderer.material.color = color;
   for (var child : Transform in transform)
   {
      if (child != infoPlane && child != AOE)
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
      AOEMeshFilter.mesh = TowerUtil.CreateAOEMesh(newAOE, 1.0);
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
         if (child != infoPlane && child != AOE)
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
         if (child != infoPlane && child != AOE)
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

function FindTarget(checkLOS : boolean)
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
               var pass : boolean = false;

               if (checkLOS == false)
                  pass = true;
               else
               {
                  // Check if object is in line of sight
                  var mask = (1 << 10); // BLOCKS
                  if (Physics.Linecast(transform.position, obj.transform.position, mask)==false)
                     pass = true;
               }

               if (pass)
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
      }
   }
   return targ;
}

function GetCurrentCost() : float
{
   return GetCost(range, fireRate, damage);
}

function GetCurrentTimeCost() : float
{
   return GetTimeCost(range, fireRate, damage);
}

function GetCost(newRange : float, newFireRate : float, newDamage : float) : int
{
   var costValue : int = base.cost;
   costValue += Mathf.FloorToInt(newRange * base.rangeCostMult);
   costValue += Mathf.FloorToInt((1.0/newFireRate * base.fireRateCostMult));
   costValue += Mathf.FloorToInt(newDamage * base.damageCostMult);
   return costValue;
}

function GetTimeCost(newRange : float, newFireRate : float, newDamage : float) : float
{
   var timeVal : float = base.buildTime;
   timeVal += newRange * base.rangeTimeCostMult;
   var denom : float = (newFireRate * base.fireRateTimeCostMult);
   timeVal += (denom==0.0) ? 0.0 : 1.0/denom;
   timeVal += newDamage * base.damageTimeCostMult;
   return timeVal;
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
   if (AOE)
      Destroy(AOE.gameObject);
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