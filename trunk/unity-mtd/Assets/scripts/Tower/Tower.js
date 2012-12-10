#pragma strict
#pragma downcast

var type : int;
var typeName : String;
var spawnedByMap : boolean;
var costs : TowerCost;
var base : TowerAttributes;
var scaleLimits : Vector2;
var verticalOffset : float;
var character : GameObject;
var model : Renderer;
var staticVisuals : GameObject[];
var tooltip : String;
var placeFOV : boolean;
var placeWithOrient : boolean;
var defaultMaterial: Material;
var constructingMaterial : Material;
var selectionMaterial : Material;
var infoPlane : Transform;
var FOVMeshFilter : MeshFilter;
var FOVMeshRender: MeshRenderer;
var FOV : Transform;
var FOVCollider: MeshCollider;
var FOVAlpha : float = 0.2;
var FOVHeight : float;
var trajectoryTracer : Transform;
var selectPrefab : Transform;
var netView : NetworkView;

var ID : int;
var range : float;
var fov : float;
var effect : int;
var fireRate : float;
var strength : float;
var color : Color;
var maxAttributePoints : int;
var targetingBehavior : int = 1;
var targets : List.<Unit>;
var isConstructing : boolean = false;
var isPlaced : boolean = false;
var isClickable : boolean = true;
var legalLocation : boolean;
var origRotation : Quaternion;

static var numAttributeUpgrades : int = 5;

private var constructionDuration : float;
private var startConstructionTime : float = 0.0;
private var endConstructionTime : float = 0.0;
private var hasTempAttributes : boolean = false;
private var isSelected : boolean = false;
private var FOVPosition : Vector3;
private var baseScale : Vector3;
private var isHovered : boolean;

var kills : int = 0;    // Stats

public enum AttributeType
{
   STRENGTH = 0,
   FIRERATE,
   RANGE,
   COUNT
};

var attributePoints  = new int[AttributeType.COUNT];

function Awake()
{
   baseScale = transform.localScale;
   FOVPosition = transform.position;
   // Detach FOV meshes so they don't rotate with parent
   FOV.parent = null;
   //FOVMeshRender.material = new Material(Shader.Find("Transparent/Diffuse"));

   // Detach FOV meshes so they don't rotate with parent
   FOVCollider.transform.parent = null;

   maxAttributePoints = base.defaultPoints;

   // Set default attributes
   SetFOV(base.defaultFOV);
   SetRange(base.defaultRange);
   SetFireRate(base.defaultFireRate);
   SetStrength(base.defaultStrength);
   //SetEffect(base.defaultEffect);

   SetChildrenMaterialColor(transform, defaultMaterial, color, false);

   if (character)
   {
      character.animation["idleRW"].layer = 0;
      character.animation["fireRW"].layer = 2;
      character.animation["spawnRW"].layer = 2;
   }

   selectPrefab.gameObject.SetActive(false);
}

function Start()
{
   if (spawnedByMap)
      Initialize(
         attributePoints[AttributeType.STRENGTH],
         attributePoints[AttributeType.FIRERATE],
         attributePoints[AttributeType.RANGE],
         color,
         FOV.position);
}

function Initialize(
   pStrength : int, pRate : int, pRange: int,
   newColor : Color,
   newFOVPosition : Vector3)
{
   FOVPosition = newFOVPosition;
   SetFOV(base.defaultFOV);
   SetAttributePoints(pStrength, pRate, pRange);
   SetColor(newColor, false);

   targetingBehavior = base.defaultTargetBehavior;

   origRotation = transform.rotation;
   FOVMeshRender.enabled = false;

   // For applying damages
   ID = Utility.GetUniqueID();

   // Play spawning animation
   if (character)
      character.animation.Play("spawnRW");


   SendMessage("AttributesSet", SendMessageOptions.DontRequireReceiver);

   // Init on server, and then send init info to clients
   if (Network.isServer)
      netView.RPC("ClientInitialize", RPCMode.Others, pStrength, pRate, pRange, newColor.r, newColor.g, newColor.b, newFOVPosition);

   // Start constructing visuals, and tell clients to do the same
   SetConstructing(TimeCost());
   if (Network.isServer)
      netView.RPC("SetConstructing", RPCMode.Others, TimeCost());

}

@RPC
function ClientInitialize(
   pStrength : int, pRate : int, pRange: int,
   colorRed : float, colorGreen : float, colorBlue : float,
   newFOVPosition : Vector3)
{
   FOVPosition = newFOVPosition;
   SetFOV(base.defaultFOV);
   SetAttributePoints(pStrength, pRate, pRange);
   SetColor(Color(colorRed, colorGreen, colorBlue), false);
   targetingBehavior = base.defaultTargetBehavior;

   FOVMeshRender.enabled = false;

   SendMessage("AttributesSet", SendMessageOptions.DontRequireReceiver);

   if (character)
      character.animation.Play("spawnRW");
}

@RPC
function ModifyBehavior(newBehaviour : int)
{
   targetingBehavior = newBehaviour;
}

@RPC
function FromClientModify(pStrength : int, pRate : int, pRange: int, info : NetworkMessageInfo)
{
   // Serverside check player can afford
   //var newCost : int = Game.costs.tower[type].TotalCost(
   //   AttributePointsToValue(AttributeType.STRENGTH, pStrength, true),
   //   AttributePointsToValue(AttributeType.FIRERATE, pRate, true),
   //   AttributePointsToValue(AttributeType.RANGE, pRange, true));
   //var costDiff : int = Cost() - newCost;

   //if (Game.control.CanClientAfford(info.sender, costDiff))
   //{
   //   Game.control.players[info.sender].credits -= costDiff;
      Modify(pStrength, pRate, pRange);
   //}
   //else
   //{
   //   Debug.LogError("Player: "+Game.control.players[info.sender].nameID+" cannot afford tower modify. Haxx?");
   //}
}

@RPC
function Modify(pStrength : int, pRate : int, pRange: int)
{
   SetAttributePoints(pStrength, pRate, pRange);

   // Init on server, and then send init info to clients
   if (Network.isServer)
      netView.RPC("Modify", RPCMode.Others, pStrength, pRate, pRange);

   var timeCost : float = TimeCost();
   // Start constructing visuals, and tell clients to do the same
   SetConstructing(timeCost);
   if (Network.isServer)
      netView.RPC("SetConstructing", RPCMode.Others, timeCost);
}

function AttributePointsToValue(attribute : AttributeType, points : int, returnNormalized : boolean) : float
{
   var returnValue : float = 0.0;
   switch (attribute)
   {
      case AttributeType.STRENGTH:
         returnValue = AdjustStrength(1.0*points/numAttributeUpgrades, returnNormalized);
         break;
      case AttributeType.FIRERATE:
         returnValue = AdjustFireRate(1.0*points/numAttributeUpgrades, returnNormalized);
         break;
      case AttributeType.RANGE:
         returnValue = AdjustRange(1.0*points/numAttributeUpgrades, returnNormalized);
         break;
   }
   return returnValue;
}

function Update()
{
   var c : Color;
   if (isConstructing)
   {
      // Animate model texture for that weird fx...
      //var texOffset : Vector2 = Vector2(Time.time * 5.0, Time.time * 5.0);
      //SetChildrenTextureOffset(transform, texOffset);

      // Animate clock gui texture
      //infoPlane.transform.position = transform.position + (Camera.main.transform.up*1.1);  //+ (Camera.main.transform.right*0.75);
      var timerVal : float = (Time.time-startConstructionTime)/constructionDuration;
      infoPlane.renderer.material.SetFloat("_Cutoff", Mathf.InverseLerp(0, 1, timerVal));

      c = Color.Lerp(Color.black, color, timerVal);
      SetChildrenColor(transform, c, true);

      // Server checks completion time and informs clients
      if (!Network.isClient && Time.time >= endConstructionTime)
      {
         SetConstructing(0.0);
         if (Network.isServer)
            netView.RPC("SetConstructing", RPCMode.Others, 0.0);
      }
   }
   else
   {
      // Cleanup any dead targets
      for (var i : int = targets.Count-1; i >= 0; --i)
      {
         var unit : Unit = targets[i];
         if (!unit)
            targets.RemoveAt(i); // if target is null, remove from list
      }
   }
}

function SetRange(newRange : float)
{
   range = newRange;
   FOV.transform.localScale = Vector3.one*(newRange);
   FOVCollider.transform.localScale = FOV.transform.localScale;
}

function SetFireRate(newFireRate : float)
{
   fireRate = newFireRate;
}

function SetFOV(newFOV : float)
{
   fov = newFOV;
   SetFOVMesh(newFOV);
   FOVCollider.sharedMesh = FOVMeshFilter.mesh;
   FOVCollider.transform.localScale = FOV.transform.localScale;
   targets.Clear();

   FOV.position = FOVPosition;
   FOVCollider.transform.position = FOVPosition;
}

function SetStrength(newStrength : float)
{
   strength = newStrength;
   transform.localScale = Vector3.one * Mathf.Lerp(scaleLimits.x, scaleLimits.y, AdjustStrength(strength, true));
}

function SetColor(newColor : Color, temp : boolean)
{
   if (!temp)
      color = newColor;
   SetChildrenColor(transform, newColor, false);
   if (FOVMeshRender)
   {
      var c : Color = newColor;
      c.a = FOVAlpha;
      FOVMeshRender.material.color = c;
      FOVMeshRender.material.SetColor("_TintColor", c);
   }
}

private var lastAOE = -1;
function SetFOVMesh(newAOE : float)
{
   if (lastAOE != newAOE)
   {
      FOVMeshFilter.mesh = TowerUtil.CreateAOEMesh(newAOE, 1.0, FOVHeight);
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
      if (isPlaced)
         SetChildrenMaterialColor(transform, constructingMaterial, color, false);
      hasTempAttributes = false;
   }
   else
   {
      constructionDuration = 0.0;
      startConstructionTime = 0.0;
      endConstructionTime = 0.0;
      infoPlane.renderer.enabled = false;
      SetChildrenMaterialColor(transform, defaultMaterial, color, false);
      isPlaced = true;
      character.animation.CrossFade("idleRW");
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

function AddTarget(unit : Unit)
{
   targets.Add(unit);
}

function RemoveTarget(unit : Unit)
{
   targets.Remove(unit); // O(n)
}

function FindSingleTarget(checkLOS : boolean)
{
   var targ : GameObject = null;
   var position : Vector3 = transform.position;
   var closestDist : float = Mathf.Infinity;
   var leastHealth : float = Mathf.Infinity;
   var bestColorDiff : float = 0.0;

   // Iterate through them and find best target for behavior.
   // NOTE: Iterates backwards so a remove can safely occur
   // without throwing off iterators.
   for (var i : int = targets.Count-1; i >= 0; --i)
   {
      var unit : Unit = targets[i];
      if (!unit)
      {
         targets.RemoveAt(i); // if target is null, remove from list
      }
      // Check unit is alive and not paused
      else if (unit.isAttackable)
      {
         var diff = (unit.transform.position - position);
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
                  if (Physics.Linecast(transform.position, unit.transform.position, mask)==false)
                     pass = true;
               }

               if (pass)
               {
                  // Target closest
                  switch (targetingBehavior)
                  {
                     // WEAKEST
                     case 0:
                        if (unit.health < leastHealth)
                        {
                           leastHealth = unit.health;
                           targ = unit.gameObject;
                        }
                     break;

                     // CLOSEST
                     case 1:
                        if (dist < closestDist)
                        {
                           closestDist = dist;
                           targ = unit.gameObject;
                        }
                     break;

                     // BEST COLOR
                     case 2:
                        var unitColor : Color = unit.actualColor;
                        var colorDiff = Utility.ColorMatch(color, unitColor);
                        if (colorDiff > bestColorDiff)
                        {
                           bestColorDiff = colorDiff;
                           targ = unit.gameObject;
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
   //return costs.Cost(
   //   AdjustRange(range, true),
   //   AdjustFOV(fov, true),
   //   AdjustFireRate(fireRate, true),
   //   AdjustStrength(strength, true),
   //   effect);

   return Game.costs.tower[type].TotalCost(
      AdjustStrength(strength, true),
      AdjustFireRate(fireRate, true),
      AdjustRange(range, true));
}

//static function Cost(type : int, pStrength : int, pRate : int, pRange : int)
//{
//   Game.costs.tower[type].TotalCost(pStrength, p
//}

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
   if (isPlaced)
      UIControl.CurrentUI().SendMessage("OnClickTower", this, SendMessageOptions.DontRequireReceiver);
}

function OnMouseEnter()
{
   if (isPlaced)
      UIControl.CurrentUI().SendMessage("OnMouseEnterTower", this, SendMessageOptions.DontRequireReceiver);
   if (isPlaced || isSelected)
      FOVMeshRender.enabled = true;
}

function OnMouseExit()
{
   if (isPlaced)
      UIControl.CurrentUI().SendMessage("OnMouseExitTower", this, SendMessageOptions.DontRequireReceiver);
   if (isPlaced && !isSelected)
      FOVMeshRender.enabled = false;
}

function SetHovered(hovered : boolean)
{
   isHovered = hovered;
   SetChildrenHovered(transform, isHovered);
}

function SetSelected(selected : boolean)
{
   isSelected = selected;
   FOVMeshRender.enabled = selected;

   selectPrefab.gameObject.SetActive(isSelected);
   var tween : TweenScale = selectPrefab.GetComponent(TweenScale);
   if (tween && isSelected)
   {
      tween.Reset();
      tween.Play(true);
   }
}

function SetAttributePoints(pStrength : int, pRate : int, pRange : int) : boolean
{
   // Out of bounds values
   if (pStrength > numAttributeUpgrades || pStrength < 0)
      return false;
   if (pRate > numAttributeUpgrades || pRate < 0)
      return false;
   if (pRange > numAttributeUpgrades || pRange < 0)
      return false;

   // Not enough points
   //var totalPointsUsed : int = (pStrength + pRate + pRange);
   //if (totalPointsUsed > maxAttributePoints || totalPointsUsed < 0)
   //   return false;

   // Set point values
   attributePoints[AttributeType.STRENGTH] = pStrength;
   attributePoints[AttributeType.FIRERATE] = pRate;
   attributePoints[AttributeType.RANGE] = pRange;

   // Set actual unnormalized attribute values
   SetStrength(AdjustStrength(1.0*pStrength/numAttributeUpgrades, false));
   SetFireRate(AdjustFireRate(1.0*pRate/numAttributeUpgrades, false));
   SetRange(AdjustRange(1.0*pRange/numAttributeUpgrades, false));

   SendMessage("AttributesSet", SendMessageOptions.DontRequireReceiver);

   return true;
}

function UsedAttributePoints() : int
{
   var total : int = 0;
   for (var i : int=0; i<AttributeType.COUNT; i++)
      total += attributePoints[i];
   return total;
}

function ModifyAttributePoints(attributeType : AttributeType, amount : int) : boolean
{
   var retVal : boolean = false;
   switch (attributeType)
   {
      case AttributeType.STRENGTH:
         retVal = SetAttributePoints(
            attributePoints[AttributeType.STRENGTH]+amount,
            attributePoints[AttributeType.FIRERATE],
            attributePoints[AttributeType.RANGE]);
      break;
      case AttributeType.FIRERATE:
         retVal = SetAttributePoints(
            attributePoints[AttributeType.STRENGTH],
            attributePoints[AttributeType.FIRERATE]+amount,
            attributePoints[AttributeType.RANGE]);
      break;
      case AttributeType.RANGE:
         retVal = SetAttributePoints(
            attributePoints[AttributeType.STRENGTH],
            attributePoints[AttributeType.FIRERATE],
            attributePoints[AttributeType.RANGE]+amount);
      break;
   }
   return retVal;
}

function ResetAttributePoints()
{
   SetAttributePoints(0,0,0);
}

function CopyAttributePoints(fromTower : Tower)
{
   SetAttributePoints(
      fromTower.attributePoints[AttributeType.STRENGTH],
      fromTower.attributePoints[AttributeType.FIRERATE],
      fromTower.attributePoints[AttributeType.RANGE]);
}

function AdjustRange(theRange : float, toNormalized : boolean) : float
{
   return (toNormalized) ? Mathf.InverseLerp(base.rangeLimits.x, base.rangeLimits.y, theRange) : Mathf.Lerp(base.rangeLimits.x, base.rangeLimits.y, theRange);
}

function AdjustFOV(theFOV : float, returnNormalized : boolean) : float
{
   return (returnNormalized) ? Mathf.InverseLerp(base.fovLimits.x, base.fovLimits.y, theFOV) : Mathf.Lerp(base.fovLimits.x, base.fovLimits.y, theFOV);
}

function AdjustFireRate(theFireRate : float, returnNormalized : boolean) : float
{
   //return (normalize) ? Mathf.InverseLerp(maxFireRate, minFireRate, theFireRate) : Mathf.Lerp(maxFireRate, minFireRate, theFireRate);
   return (returnNormalized) ? Mathf.InverseLerp(base.fireRateLimits.x, base.fireRateLimits.y, theFireRate) : Mathf.Lerp(base.fireRateLimits.x, base.fireRateLimits.y, theFireRate);
}

function AdjustStrength(theStrength: float, returnNormalized : boolean) : float
{
   return (returnNormalized) ? Mathf.InverseLerp(base.strengthLimits.x, base.strengthLimits.y, theStrength) : Mathf.Lerp(base.strengthLimits.x, base.strengthLimits.y, theStrength);
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}

function SetChildrenMaterialColor(t : Transform, newMaterial : Material, newColor : Color, force : boolean)
{
   if (!force)
   {
      for (var go : GameObject in staticVisuals)
      {
         if (go.gameObject == t.gameObject)
            return;
      }
   }

   var c : Color = newColor;
   if (t.renderer)
   {
      t.renderer.material = newMaterial;
      if (!isPlaced)
         c.a = FOVAlpha;
      t.renderer.material.SetColor("_TintColor", c);
      t.renderer.material.color = c;
   }
   for (var child : Transform in t)
      SetChildrenMaterialColor(child, newMaterial, newColor, force);
}

private function SetChildrenColor(t : Transform, newColor : Color, force : boolean)
{
   if (!force)
   {
      for (var go : GameObject in staticVisuals)
      {
         if (go.gameObject == t.gameObject)
            return;
      }
   }

   var c : Color = newColor;
   if (t.renderer)
   {
      // Has not been placed yet
      if (!isPlaced)
         c.a = FOVAlpha;
      t.renderer.material.SetColor("_TintColor", c);
      t.renderer.material.color = c;

   }
   for (var child : Transform in t)
      SetChildrenColor(child, newColor, force);
}

private function SetChildrenTextureOffset(t : Transform, newOffset : Vector2)
{
   if (t.renderer && t != infoPlane && t != FOV)
      t.renderer.material.SetTextureOffset("_MainTex", newOffset);

   for (var child : Transform in t)
      SetChildrenTextureOffset(child, newOffset);
}

function SetChildrenHovered(t : Transform, hovered : boolean)
{
   if (t.renderer && t != infoPlane && t != FOV)
   {
      t.renderer.material.SetColor("_OutlineColor", (hovered) ? Color.green : Color.black);
      t.renderer.material.SetFloat("_Outline", (hovered) ? 0.007 : 0.001);
   }

   for (var child : Transform in t)
      SetChildrenHovered(child, hovered);
}

function OnDestroy()
{
   if (FOV)
      Destroy(FOV.gameObject);
   if (FOVCollider)
      Destroy(FOVCollider.gameObject);
}


function OnNetworkInstantiate(info : NetworkMessageInfo)
{
   // Network instantiated, turn on netview
   netView.enabled = true;
   origRotation = transform.rotation;
   FOVMeshRender.enabled = false;
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