#pragma strict
#pragma downcast

var ID : int;
var type : int;
var range : float;
var fov : float;
var effect : int;
var fireRate : float;
var strength : float;
var color : Color;
var costs : TowerCost;
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
   ID = Utility.GetUniqueID();

   // Init on server, and then send init info to clients
   if (Game.hostType > 0)
      netView.RPC("Init", RPCMode.Others, newRange, newFOV, newRate, newStrength, newEffect, newColor.r, newColor.g, newColor.b, newBehaviour);

   // Start constructing visuals, and tell clients to do the same
   SetConstructing(TimeCost());
   if (Game.hostType > 0)
      netView.RPC("SetConstructing", RPCMode.Others, TimeCost());
}

@RPC
function Init(newRange : float, newFOV : float, newRate : float, newStrength : float,
              newEffect : int, colorRed : float, colorGreen : float, colorBlue : float,
              newBehaviour : int)
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
function ModifyBehavior(newBehaviour : int)
{
   targetingBehavior = newBehaviour;
}

@RPC
function Modify(newRange : float, newFOV : float, newRate : float, newStrength : float,
                newEffect : int, colorRed : float, colorGreen : float, colorBlue : float,
                newBehaviour : int)
{
   var origTimeCost : float = TimeCost();
   var origColor : Color = color;
   var timeCost : float = 0.0;
   var newColor : Color = new Color(colorRed, colorGreen, colorBlue);
   var changedEffect : boolean = false;

   SetFOV(newFOV);
   SetRange(newRange);
   strength = newStrength;
   fireRate = newRate;
   if (newEffect != effect)
      changedEffect = true;
   effect = newEffect;
   SetColor(newColor);
   targetingBehavior = newBehaviour;

   // Init on server, and then send init info to clients
   if (Game.hostType > 0)
      netView.RPC("Init", RPCMode.Others, newRange, newFOV, newRate, newStrength, newEffect, colorRed, colorGreen, colorBlue, newBehaviour);

   var newTimeCost : float = TimeCost();
   timeCost = (changedEffect) ? newTimeCost : Mathf.Abs(newTimeCost - origTimeCost);

   //var colorDiffCost : float = costs.ColorDiffTimeCost(color, newColor);
   var colorDiff : float = (1.0-Utility.ColorMatch(origColor, newColor));
   timeCost += ((newTimeCost/2) * colorDiff);

   // Start constructing visuals, and tell clients to do the same
   SetConstructing(timeCost);
   if (Game.hostType > 0)
      netView.RPC("SetConstructing", RPCMode.Others, timeCost);
}

function Update()
{
   // Selection state changes
   if (isSelected != (Game.player.selectedTower == gameObject))
   {
      isSelected = (Game.player.selectedTower == gameObject);
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
      // Animate model texture for that weird fx...
      var texOffset : Vector2 = Vector2(Time.time * 5.0, Time.time * 5.0);
      SetChildrenTextureOffset(transform, texOffset);

      // Animate clock gui texture
      infoPlane.transform.position = transform.position + (Camera.main.transform.up*1.1);  //+ (Camera.main.transform.right*0.75);
      var timerVal : float = (Time.time-startConstructionTime)/constructionDuration;
      infoPlane.renderer.material.SetFloat("_Cutoff", Mathf.InverseLerp(0, 1, timerVal));

      // Server checks completion time and informs clients
      if ((Network.isServer || Game.hostType==0) && Time.time >= endConstructionTime)
      {
         SetConstructing(0.0);
         if (Game.hostType>0)
            netView.RPC("SetConstructing", RPCMode.Others, 0.0);
      }
   }
   else
   {
      // Pulsate
      if (isSelected && hasTempAttributes)
      {
         //renderer.material.color.a = GUIControl.colorPulsateValue;
         //for (var child : Transform in transform)
         //{
         //   if (child != infoPlane && child != AOE)
         //      child.renderer.material.color.a = GUIControl.colorPulsateValue;
         //}
         AOEMeshRender.material.color.a = GUIControl.colorPulsateValue;
      }
   }
}

function SetRange(newRange : float)
{
   range = newRange;
   AOE.transform.localScale = Vector3.one*(newRange);
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

      // Set model texture for that weird fx...
      SetChildrenMaterialColor(transform, constructingMaterial, color);

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
      // Render normally - no build fx
      SetChildrenMaterialColor(transform, defaultMaterial, color);
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
      var unitScr : Unit = obj.GetComponent(Unit);
      if (unitScr.isAttackable && unitScr.health > 0 && unitScr.unpauseTime == 0.0)
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
   var position : Vector3 = transform.position;
   var closestDist : float = Mathf.Infinity;
   var leastHealth : float = Mathf.Infinity;
   var bestColorDiff : float = 0.0;

   // Find all game objects with tag
   var objs : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");

   // Iterate through them and find the closest one
   for (var obj : GameObject in objs)
   {
      var unitScr : Unit = obj.GetComponent(Unit);
      // Check unit is alive and not paused
      if (unitScr.isAttackable && unitScr.health > 0 && unitScr.unpauseTime == 0.0)
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
                        if (unitScr.health < leastHealth)
                        {
                           leastHealth = unitScr.health;
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
                        var unitColor : Color = obj.GetComponent(Unit).actualColor;
                        var colorDiff = Utility.ColorMatch(color, unitColor);
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

function Cost() : float
{
   return costs.Cost(
      AdjustRange(range, true),
      AdjustFOV(fov, true),
      AdjustFireRate(fireRate, true),
      AdjustStrength(strength, true),
      effect);
}

function TimeCost() : float
{
   return costs.TimeCost(
      AdjustRange(range, true),
      AdjustFOV(fov, true),
      AdjustFireRate(fireRate, true),
      AdjustStrength(strength, true),
      effect);
}

function OnMouseDown()
{
   // Defender selects this tower
   if (!Game.player.isAttacker)
      Game.player.selectedTower = gameObject;
}

function OnMouseEnter()
{
   // Attacker mouseover to see FOV
   if (Game.player.isAttacker)
      Game.player.selectedTower = gameObject;
}

function OnMouseExit()
{
   // Attacker mouseover to see FOV
   if (Game.player.isAttacker && Game.player.selectedTower==gameObject)
      Game.player.selectedTower = null;
}

private function SetChildrenTextureOffset(t : Transform, newOffset : Vector2)
{
   if (t != infoPlane && t != AOE)
      t.renderer.material.SetTextureOffset("_MainTex", newOffset);
   for (var child : Transform in t)
      SetChildrenTextureOffset(child, newOffset);
}

private function SetChildrenMaterialColor(t : Transform, newMaterial : Material, newColor : Color)
{
   if (t != infoPlane && t != AOE)
   {
      t.renderer.material = newMaterial;
      t.renderer.material.SetColor("_TintColor", newColor);
      t.renderer.material.color = newColor;
   }
   for (var child : Transform in t)
      SetChildrenMaterialColor(child, newMaterial, newColor);
}

function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t != infoPlane)
      t.renderer.material.color = newColor;
   for (var child : Transform in t)
      SetChildrenColor(child, newColor);
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

function AdjustRange(theRange : float, normalize : boolean) : float
{
   return (normalize) ? Mathf.InverseLerp(base.minRange, base.maxRange, theRange) : Mathf.Lerp(base.minRange, base.maxRange, theRange);
}

function AdjustFOV(theFOV : float, normalize : boolean) : float
{
   return (normalize) ? Mathf.InverseLerp(base.minFOV, base.maxFOV, theFOV) : Mathf.Lerp(base.minFOV, base.maxFOV, theFOV);
}

function AdjustFireRate(theFireRate : float, normalize : boolean) : float
{
   //return (normalize) ? Mathf.InverseLerp(maxFireRate, minFireRate, theFireRate) : Mathf.Lerp(maxFireRate, minFireRate, theFireRate);
   return (normalize) ? Mathf.InverseLerp(base.minFireRate, base.maxFireRate, theFireRate) : Mathf.Lerp(base.minFireRate, base.maxFireRate, theFireRate);
}

function AdjustStrength(theStrength: float, normalize : boolean) : float
{
   return (normalize) ? Mathf.InverseLerp(base.minStrength, base.maxStrength, theStrength) : Mathf.Lerp(base.minStrength, base.maxStrength, theStrength);
}