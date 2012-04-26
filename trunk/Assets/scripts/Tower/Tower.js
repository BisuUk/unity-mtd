#pragma strict
#pragma downcast

var id : int;
var type : int;
var range : float;
var fov : float;
var effect : int;
var fireRate : float;
var strength : float;
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
private var hasTempAttributes : boolean = false;
private var isSelected : boolean = false;

var kills : int = 0;    // Stats

function Awake()
{
   AOE.parent = null; // Detach AOE mesh so that it doesn't rotate with the tower
   AOEMeshRender.material = new Material(Shader.Find("Transparent/Diffuse"));

   // Set default attributes
   SetFOV(base.defaultFOV);
   SetRange(base.defaultRange);
   fireRate = base.defaultFireRate;
   strength = base.defaultStrength;
}

function Initialize(newRange : float, newFOV : float, newRate : float, newStrength : float, newEffect : int, newColor : Color, newBehaviour : int)
{
   SetFOV(newFOV);
   SetRange(newRange);
   strength = newStrength;
   fireRate = newRate;
   effect = newEffect;
   SetColor(newColor);
   targetingBehavior = newBehaviour;
   origRotation = transform.rotation;
   AOEMeshRender.enabled = false;

   // For applying damages
   id = GameData.GetTowerID();

   // Init on server, and then send init info to clients
   if (GameData.hostType > 0)
      netView.RPC("Init", RPCMode.Others, newRange, newFOV, newRate, newStrength, newEffect, newColor.r, newColor.g, newColor.b, newBehaviour);

   // Start constructing visuals, and tell clients to do the same
   SetConstructing(GetCurrentTimeCost());
   if (GameData.hostType > 0)
      netView.RPC("SetConstructing", RPCMode.Others, GetCurrentTimeCost());
}

@RPC
function Init(newRange : float, newFOV : float, newRate : float, newStrength : float, newEffect : int, colorRed : float, colorGreen : float, colorBlue : float, newBehaviour : int)
{
   SetFOV(newFOV);
   SetRange(newRange);
   strength = newStrength;
   fireRate = newRate;
   effect = newEffect;
   SetColor(Color(colorRed, colorGreen, colorBlue));
   targetingBehavior = newBehaviour;
}

@RPC
function Modify(newRange : float, newFOV : float, newRate : float, newStrength : float,
                newEffect : int, colorRed : float, colorGreen : float, colorBlue : float,
                newBehaviour : int)
{
   var origTimeCost : float = GetCurrentTimeCost();
   var newColor : Color = new Color(colorRed, colorGreen, colorBlue);
   var colorDiffCost : float = GetColorDeltaTimeCost(color, newColor);

   SetFOV(newFOV);
   SetRange(newRange);
   strength = newStrength;
   fireRate = newRate;
   effect = newEffect;
   SetColor(newColor);
   targetingBehavior = newBehaviour;

   var newTimeCost : float = GetCurrentTimeCost();

   newTimeCost = Mathf.Abs(newTimeCost - origTimeCost);
   newTimeCost += colorDiffCost;

   // Init on server, and then send init info to clients
   if (GameData.hostType > 0)
      netView.RPC("Init", RPCMode.Others, newRange, newFOV, newRate, newStrength, newEffect, colorRed, colorGreen, colorBlue, newBehaviour);

   // Start constructing visuals, and tell clients to do the same
   SetConstructing(newTimeCost);
   if (GameData.hostType>0)
      netView.RPC("SetConstructing", RPCMode.Others, newTimeCost);
}

function Update()
{
   // Selection state changes
   if (isSelected != (GameData.player.selectedTower == gameObject))
   {
      isSelected = (GameData.player.selectedTower == gameObject);
      // If this tower is selected, draw FOV
      AOEMeshRender.enabled = isSelected;

      // If tower was visually modified by the GUI, revert changes
      if (!isSelected)
      {
         SetRange(range);
         SetFOV(fov);
         SetColor(color);
         hasTempAttributes = false;
      }
   }

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
      if ((Network.isServer || GameData.hostType==0) && Time.time >= endConstructionTime)
      {
         SetConstructing(0.0);
         if (GameData.hostType>0)
            netView.RPC("SetConstructing", RPCMode.Others, 0.0);
      }
   }
   else
   {
      // Pulsate
      if (isSelected && hasTempAttributes)
      {
         renderer.material.color.a = GUIControl.colorPulsateValue;
         for (var child : Transform in transform)
         {
            if (child != infoPlane && child != AOE)
               child.renderer.material.color.a = GUIControl.colorPulsateValue;
         }
         AOEMeshRender.material.color.a = GUIControl.colorPulsateValue;
      }
   }
}

function SetRange(newRange : float)
{
   range = newRange;
   AOE.transform.localScale = Vector3.one*(newRange);
}

private function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t != infoPlane && t != AOE)
      t.renderer.material.color = newColor;
   for (var child : Transform in t)
   {
      SetChildrenColor(child, newColor);
   }
}

function SetColor(newColor : Color)
{
   color = newColor;
   SetChildrenColor(transform, newColor);
   if (AOEMeshRender)
   {
      AOEMeshRender.material.color = color;
      AOEMeshRender.material.color.a = 0.3;
   }
}

function SetFOV(newFOV : float)
{
   fov = newFOV;
   SetAOEMesh(newFOV);
}

function SetTempColor(newColor : Color)
{
   hasTempAttributes = true;
   SetChildrenColor(transform, newColor);
   if (AOEMeshRender)
   {
      AOEMeshRender.material.color = newColor;
      AOEMeshRender.material.color.a = 0.3;
   }
}

function SetTempEffect(newEffect : int)
{
   hasTempAttributes = true;
}


function SetTempFireRate(newFireRate : float)
{
   hasTempAttributes = true;
}

function SetTempStrength(newStrength : float)
{
   hasTempAttributes = true;
}

function SetTempRange(newRange : float)
{
   hasTempAttributes = true;
   AOE.transform.localScale = Vector3.one*(newRange);
}

function SetTempFOV(newFOV : float)
{
   hasTempAttributes = true;
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
      hasTempAttributes = false;
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

function FindTargets(targs : List.<GameObject>, checkLOS : boolean)
{
   var position = transform.position;
   targs.Clear();
   //var targs : List.<GameObject> = new List.<GameObject>();

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
               targs.Add(obj);
            }
         }
      }
   }
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
                  var mask = (1 << 9); // OBSTRUCT
                  if (Physics.Linecast(transform.position, obj.transform.position, mask)==false)
                     pass = true;
               }

               if (pass)
               {
                  // Target closest
                  switch (targetingBehavior)
                  {
                     // WEAKEST
                     case 0:
                        if (unitHealth < leastHealth)
                        {
                           leastHealth = unitHealth;
                           targ = obj;
                        }
                     break;

                     // CLOSEST
                     case 1:
                        if (dist < closestDist)
                        {
                           closestDist = dist;
                           targ = obj;
                        }
                     break;

                     // BEST COLOR
                     case 2:
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
                     break;
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
   return GetCost(
      base.AdjustRange(range, true),
      base.AdjustFOV(fov, true),
      base.AdjustFireRate(fireRate, true),
      base.AdjustStrength(strength, true),
      effect);
}

// All float values should be normalized (0.0 - 1.0)
function GetCost(newRange : float, newFOV : float, newFireRate : float, newStrength : float, newEffect : int) : int
{
   var costValue : int = Mathf.FloorToInt( ((newRange + newFOV + newFireRate + newStrength) / 4.0) * base.maxCost );
   costValue += base.minCost;
   return costValue;
}

function GetColorDeltaCost(startColor : Color, endColor : Color) : int
{
   var sC : HSBColor = new HSBColor(startColor);
   var eC : HSBColor = new HSBColor(endColor);

   var p1 : Vector2 = (Vector2(Mathf.Cos(sC.h*360*Mathf.Deg2Rad), -Mathf.Sin (sC.h*360*Mathf.Deg2Rad)) * sC.s/2);
   var p2 : Vector2 = (Vector2(Mathf.Cos(eC.h*360*Mathf.Deg2Rad), -Mathf.Sin (eC.h*360*Mathf.Deg2Rad)) * eC.s/2);

   return Mathf.FloorToInt( ((p1-p2).magnitude)*base.maxColorCost );
}

function GetCurrentTimeCost() : float
{
   return GetTimeCost(
      base.AdjustRange(range, true),
      base.AdjustFOV(fov, true),
      base.AdjustFireRate(fireRate, true),
      base.AdjustStrength(strength, true),
      effect);
}

// All float values should be normalized (0.0 - 1.0)
function GetTimeCost(newRange : float, newFOV : float, newFireRate : float, newStrength : float, newEffect : int) : float
{
   var timeValue : float = ((newRange + newFOV + newFireRate + newStrength) / 4.0) * base.maxTimeCost;
   return timeValue;
}

function GetColorDeltaTimeCost(startColor : Color, endColor : Color) : float
{
   var sC : HSBColor = new HSBColor(startColor);
   var eC : HSBColor = new HSBColor(endColor);

   var p1 : Vector2 = (Vector2(Mathf.Cos(sC.h*360*Mathf.Deg2Rad), -Mathf.Sin (sC.h*360*Mathf.Deg2Rad)) * sC.s/2);
   var p2 : Vector2 = (Vector2(Mathf.Cos(eC.h*360*Mathf.Deg2Rad), -Mathf.Sin (eC.h*360*Mathf.Deg2Rad)) * eC.s/2);

   return ((p1-p2).magnitude)*base.maxColorTimeCost;
}

function OnMouseDown()
{
   // Defender selects this tower
   if (!GameData.player.isAttacker)
      GameData.player.selectedTower = gameObject;
}

function OnMouseEnter()
{
   // Attacker mouseover to see FOV
   if (GameData.player.isAttacker)
      GameData.player.selectedTower = gameObject;
}

function OnMouseExit()
{
   // Attacker mouseover to see FOV
   if (GameData.player.isAttacker && GameData.player.selectedTower==gameObject)
      GameData.player.selectedTower = null;
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
   origRotation = transform.rotation;
   AOEMeshRender.enabled = false;
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