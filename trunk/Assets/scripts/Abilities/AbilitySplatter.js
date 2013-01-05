#pragma strict
#pragma downcast

//var projector : Projector;
var decal : DecalType;
var decalMeshObject : Transform;

private var color : Color;

private static var offsetCounter : float = 0.002;

function Awake()
{
   // Copy material, projectors use 'shared' materials
   //mat = new Material(projector.material);
   //projector.material = mat;
}

function OnDestroy()
{
   Destroy(decalMeshObject.gameObject);
}

function Hit(hit : RaycastHit)
{
   var m : Material = Instantiate(decal.i_material) as Material;
   m.color = color;
   decal.i_bitOffset = offsetCounter;
   offsetCounter += 0.002;
   var decalMesh : Mesh  = DecalCreator.CreateDecalMesh(decal, hit.point, -hit.normal, hit.collider.gameObject);
   decalMesh = DecalCreator.MeshWorldToObjectSpace(decalMesh, hit.collider.transform);
   //DecalCreator.CreateDynamicDecal(decalMesh, hit.collider.gameObject, decal, m);
   decalMeshObject.GetComponent(MeshFilter).sharedMesh = decalMesh;
   decalMeshObject.GetComponent(MeshRenderer).material = m;
   decalMeshObject.localScale = hit.collider.transform.lossyScale;
   decalMeshObject.position = hit.collider.transform.position;
   decalMeshObject.rotation = hit.collider.transform.rotation;
   decalMeshObject.parent = hit.collider.transform;
   decalMesh.RecalculateBounds();
}
/*
function MakeDecalObject(decalMesh : Mesh) : GameObject
{
   var GameObject newFreeDecal = new GameObject("Free Decal");
   newFreeDecal.layer = DecalType.i_layer;
   newFreeDecal.transform.parent = transform;
   newFreeDecal.transform.localPosition = Vector3.zero;
   newFreeDecal.transform.localRotation = Quaternion.identity;
   newFreeDecal.transform.localScale = new Vector3(1, 1, 1);
   var MeshFilter mFilter = newFreeDecal.AddComponent<MeshFilter>();
   var MeshRenderer mRenderer = newFreeDecal.AddComponent<MeshRenderer>();
   mFilter.sharedMesh = decalMesh;
   mRenderer.material = renderer.sharedMaterial;
   mRenderer.castShadows = false;
   
   return newFreeDecal;
}
*/
function SetColor(newColor : Color)
{
   if (newColor == Color.black)
   {
      DoWash();
      Destroy(gameObject);
   }
   else
   {
      // Set color to be alpha'd out
      color = newColor;
      //var c : Color = color;
      //c.a = 0;
      //mat.SetColor("_TintColor", c);
   }
}

function OnTriggerEnter(other : Collider)
{
   var unit : UnitSimple = other.GetComponent(UnitSimple);
   if (unit)
   {
      switch (color)
      {
         case Utility.colorYellow:
            DoBounce(unit);
            break;
         case Color.red:
            DoSpeed(unit);
            break;
         default:
            break;
      }
   }
}

function OnMouseEnter()
{
   UIControl.CurrentUI().SendMessage("OnHoverSplatter", this, SendMessageOptions.DontRequireReceiver);
}

function DoWash()
{
   var range : float = 10.0;
   var objectArray : GameObject[] = GameObject.FindGameObjectsWithTag("WASHABLE");
   // Order by distance position
   var objectList : List.<GameObject> = objectArray.OrderBy(function(x){return (x.transform.position-transform.position).magnitude;}).ToList();

   for (var obj : GameObject in objectList)
   {
      if (obj == gameObject)
         continue;
      var affect : boolean = true;
      if (range > 0.0) // < 0 == infinite range
         affect = (obj.transform.position-transform.position).magnitude <= range;

      if (affect)
      {
         Destroy(obj, 0.01);
         Game.control.OnUseAbility();
         break;
      }
   }
}

function DoBounce(unit : UnitSimple)
{
   unit.Jump(5.0, 1.0);
}

function DoSpeed(unit : UnitSimple)
{
   var buff : UnitBuff = new UnitBuff();
   buff.action = ActionType.ACTION_SPEED_CHANGE;
   buff.duration = 1.0;
   buff.magnitude = 2.0;
   unit.ApplyBuff(buff);
}
