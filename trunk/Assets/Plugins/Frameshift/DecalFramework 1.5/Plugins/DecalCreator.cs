using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// $b$Main Decal creator class$bb$
/// </summary>
public class DecalCreator : MonoBehaviour
{
    /// <summary>
    /// $b$Create Decal mesh from colliders array.$bb$
    /// </summary>
    /// <param name="decalType">Type of Decal that will be created.</param>
    /// <param name="point">Point in world space where Decal will be calculated.</param>
    /// <param name="forward">Direction of decal. Usually -hit.normal.</param>
    /// <param name="colliders">Array colliders for which are trying to create
    /// decal.</param>
    /// <returns>
    /// $b$Decal mesh in world space.$bb$
    /// </returns>
    /// <example>
    /// <code>//Find colliders near raycast hit point
    /// Collider[] colliders=Physics.OverlapSphere(hit.position, 0.3F);
    /// //Burn decal mesh
    /// Mesh decalMesh = DecalCreator.CreateDecalMesh(i_decalType,hit.position,hit.direction, colliders);
    /// //Create decal object
    /// DecalCreator.CreateDynamicDecal(decalMesh, hit.collider, i_decalType);</code>
    /// </example>
    /// <seealso cref="Frameshift.Decal.DecalType">Frameshift.Decal.DecalType</seealso>
    public static Mesh CreateDecalMesh(DecalType decalType, Vector3 point, Vector3 forward, Collider[] colliders)
    {
        return CreateDecalMesh(decalType, point, forward, colliders, Vector3.zero);
    }
    /// <summary>
    /// $b$Create Decal mesh from colliders array. Set directly orientation.$bb$
    /// </summary>
    /// <param name="decalType">Type of Decal that will be created.</param>
    /// <param name="point">Point in world space where Decal will be calculated.</param>
    /// <param name="forward">Direction of decal. Usually -hit.normal.</param>
    /// <param name="colliders">Array colliders for which are trying to create
    /// decal.</param>
    /// <param name="decalWoldUpVector">Decal world up vector, i.e. where top of decal
    /// mesh will be look. </param>
    /// <returns>
    /// $b$Decal mesh in world space.$bb$
    /// </returns>
    /// <example>
    /// <code>//Find colliders near raycast hit point
    /// Collider[] colliders=Physics.OverlapSphere(hit.position, 0.3F);
    /// //Burn decal mesh with vertical orientation
    /// Mesh decalMesh = DecalCreator.CreateDecalMesh(i_decalType,hit.position,hit.direction, colliders, Vector3.up);
    /// //Create decal object
    /// DecalCreator.CreateDynamicDecal(decalMesh, hit.collider, i_decalType);</code>
    /// </example>
    /// <seealso cref="Frameshift.Decal.DecalType">Frameshift.Decal.DecalType</seealso>
    public static Mesh CreateDecalMesh(DecalType decalType, Vector3 point, Vector3 forward, Collider[] colliders, Vector3 decalWoldUpVector)
    {
        //Создаем меши
        Plane[] planes = DecalCreator.CreatePlanes(decalType);
        List<Mesh> newMeshes = new List<Mesh>();
        foreach (Collider g in colliders)
        {
            if (!g.renderer || g.GetComponent("DecalType") as DecalType)
                continue;

            //Тестируем
            if (GeometryUtility.TestPlanesAABB(planes, g.renderer.bounds))
            {
                Mesh mesh = DecalCreator.CreateDecalMesh(decalType, point, forward, g.gameObject, decalWoldUpVector);
                if (mesh)
                {
                    mesh.name = "Temp decal";
                    newMeshes.Add(mesh);
                }
            }
        }

        Mesh combinedMesh = DecalCreator.CreateCombinedMesh(newMeshes);

        //Очищаем память
        foreach (Mesh mesh in newMeshes)
        {
            Destroy(mesh);
        }
        return combinedMesh;
    }
    /// <summary>
    /// $b$Create Decal mesh from GameObject.$bb$
    /// </summary>
    /// <param name="decalType">Type of Decal that will be created.</param>
    /// <param name="point">Point in world space where Decal will be calculated.</param>
    /// <param name="forward">Direction of decal. Usually -hit.normal.</param>
    /// <param name="obj">GameObject on which Decal will be created.</param>
    /// <returns>
    /// $b$Decal mesh in world space.$bb$
    /// </returns>
    /// <example>
    /// <code>
    /// //Burn decal
    /// Mesh decalMesh = DecalCreator.CreateDecalMesh(i_decalType, hit.point,
    /// -hit.normal, hit.collider.gameObject);
    /// //Create Decal Object
    /// DecalCreator.CreateDynamicDecal(decalMesh, hit.collider.gameObject,
    /// i_decalType);</code>
    /// </example>
    public static Mesh CreateDecalMesh(DecalType decalType, Vector3 point, Vector3 forward, GameObject obj)
    {
        return CreateDecalMesh(decalType, point, forward, obj, Vector3.zero);
    }
    /// <summary>
    /// $b$Create Decal mesh from GameObject. Set directly orientation.$bb$
    /// </summary>
    /// <param name="decalType">Type of Decal that will be created.</param>
    /// <param name="point">Point in world space where Decal will be calculated.</param>
    /// <param name="forward">Direction of decal. Usually -hit.normal.</param>
    /// <param name="obj">GameObject on which Decal will be created.</param>
    /// <param name="decalWoldUpVector">Decal world up vector, i.e. where top of decal
    /// mesh will be look.</param>
    /// <returns>
    /// $b$Decal mesh in world space.$bb$
    /// </returns>
    /// <example>
    /// <code>
    /// //Burn decal with vertical orientation
    /// Mesh decalMesh = DecalCreator.CreateDecalMesh(i_decalType, hit.point,
    /// -hit.normal, hit.collider.gameObject, Vector3.up);
    /// //Create Decal Object
    /// DecalCreator.CreateDynamicDecal(decalMesh, hit.collider.gameObject,
    /// i_decalType);</code>
    /// </example>
    public static Mesh CreateDecalMesh(DecalType decalType, Vector3 point, Vector3 forward, GameObject obj, Vector3 decalWoldUpVector)
    {
        DecalBasis decalBasis = new DecalBasis();
        return CreateDecalMesh(decalType, point, forward, obj, decalWoldUpVector, ref decalBasis);
    }    
    /// <summary>
    /// $b$Create Decal GameObject.$bb$
    /// </summary>
    /// <param name="decalMesh">Decal mesh in world space</param>
    /// <param name="obj">Parent(Holder) for Decal</param>
    /// <param name="decalType">Type of this Decal</param>
    /// <returns>
    /// $b$DecalExpeditor for this decalType on this obj$bb$
    /// </returns>
    /// <example>
    /// <code>
    /// RaycastHit hit;
    /// Ray ray = Camera.main.ViewportPointToRay(new Vector3(0.5F, 0.5F, 0));
    /// bool wasHit = Physics.Raycast(ray, out hit);
    /// if (wasHit)
    /// {
    ///     if (hit.collider.gameObject.renderer)
    ///     {      
    ///         //Burn decal
    ///         Mesh decalMesh = DecalCreator.CreateDecalMesh(i_decalType, hit.point,
    /// -hit.normal, hit.collider.gameObject);
    ///         //Create Decal Object
    ///         DecalCreator.CreateDynamicDecal(decalMesh, hit.collider.gameObject,
    /// i_decalType);
    /// 
    ///     }
    /// }</code>
    /// </example>
    public static GameObject CreateDynamicDecal(Mesh decalMesh, GameObject obj, DecalType decalType)
    {
        return CreateDynamicDecal(decalMesh,obj,decalType,null);
    }
    /// <summary>
    /// $b$Create Decal GameObject with material override.$bb$
    /// </summary>
    /// <param name="decalMesh">Decal mesh in world space</param>
    /// <param name="obj">Parent(Holder) for Decal</param>
    /// <param name="decalType">Type of this Decal</param>
    /// <param name="materialOverride">Material override for Decal</param>
    /// <returns>
    /// $b$DecalExpeditor for this decalType on this obj$bb$
    /// </returns>
    /// <example><code>
    /// RaycastHit hit;
    /// Ray ray = Camera.main.ViewportPointToRay(new Vector3(0.5F, 0.5F, 0));
    /// bool wasHit = Physics.Raycast(ray, out hit);
    /// if (wasHit)
    /// {
    ///     Material m = null;
    ///     if (hit.collider.gameObject.renderer)
    ///     {
    ///         //Get material instanse     
    ///         m = Instantiate(i_decalType.i_material) as Material;
    ///         //Get bump from hited surface
    ///         Texture2D bumpMap =
    /// hit.collider.gameObject.renderer.sharedMaterial.GetTexture("_BumpMap") as
    /// Texture2D;
    ///         Vector2 bumpScale =
    /// hit.collider.gameObject.renderer.sharedMaterial.GetTextureScale("_BumpMap");
    ///         Vector2 bumpOffset =
    /// hit.collider.gameObject.renderer.sharedMaterial.GetTextureOffset("_BumpMap");
    ///         //Setup new bump
    ///         m.SetTexture("_SourceBumpMap", bumpMap);
    ///         m.SetTextureScale("_SourceBumpMap", bumpScale);
    ///         m.SetTextureOffset("_SourceBumpMap", bumpOffset);
    /// 
    ///         //Burn decal
    ///         Mesh decalMesh = DecalCreator.CreateDecalMesh(i_decalType, hit.point,
    /// -hit.normal, hit.collider.gameObject);
    ///         //Create Decal Object
    ///         DecalCreator.CreateDynamicDecal(decalMesh, hit.collider.gameObject,
    /// i_decalType, m);
    /// 
    ///     }
    /// }</code>
    /// </example>
    public static GameObject CreateDynamicDecal(Mesh decalMesh, GameObject obj, DecalType decalType, Material materialOverride)
    {

        if (!decalMesh || decalMesh.vertexCount == 0)
            return null;

        //Если передали null то создаем декаль в мировом
        if (!obj)
        {
            throw new NullReferenceException("obj can not be a NULL Reference");
        }


        //В пространство объекта
        decalMesh = MeshWorldToObjectSpace(decalMesh, obj.transform);

        //Компонент держатель декали
        DecalHolder decalHolder = obj.GetComponent("DecalHolder") as DecalHolder;
        if (!decalHolder)
        {
            decalHolder = obj.AddComponent("DecalHolder") as DecalHolder;
        }

        //Пытаемся получить объект экспедитор
        GameObject decalTypeExpeditorObject;
        decalHolder.DecalType2DecalObject.TryGetValue(decalType, out decalTypeExpeditorObject);

        if (!decalTypeExpeditorObject)
        {
            decalTypeExpeditorObject = new GameObject("Expeditor For " + decalType.name + " DecalType");
            decalTypeExpeditorObject.AddComponent<MeshFilter>();
            decalTypeExpeditorObject.AddComponent<MeshRenderer>();
            decalTypeExpeditorObject.renderer.castShadows = false;

            if (materialOverride)
                decalTypeExpeditorObject.renderer.sharedMaterial = materialOverride;
            else
                decalTypeExpeditorObject.renderer.sharedMaterial = decalType.i_material;

            decalTypeExpeditorObject.transform.position = obj.transform.position;
            decalTypeExpeditorObject.transform.rotation = obj.transform.rotation;
            decalTypeExpeditorObject.transform.localScale = obj.transform.lossyScale;
            decalTypeExpeditorObject.transform.parent = obj.transform;
            decalTypeExpeditorObject.layer = decalType.i_layer;

            decalHolder.DecalType2DecalObject.Add(decalType, decalTypeExpeditorObject);
        }
        else
        {
            //Убираем материалл ненужный если уже назначили перезаписываемый
            if (materialOverride)
                Destroy(materialOverride);
        }

        DynamicDecalExpeditor decalExpeditor = decalTypeExpeditorObject.GetComponent("DynamicDecalExpeditor") as DynamicDecalExpeditor;
        if (!decalExpeditor)
        {
            decalExpeditor = decalTypeExpeditorObject.AddComponent("DynamicDecalExpeditor") as DynamicDecalExpeditor;
            decalExpeditor.DecalType = decalType;
            decalExpeditor.Holder = decalHolder;
        }

        decalMesh.RecalculateBounds();//<<<<< ОБЯЗАТЕЛЬНО!

        //Передаем меш
        decalExpeditor.PushNewDecalMesh(decalMesh);

        return decalTypeExpeditorObject;
    }
    /// <summary>
    /// $b$Create dynamic skinned Decal GameObject$bb$
    /// </summary>
    /// <param name="decalMesh">Decal mesh in world space</param>
    /// <param name="obj">GameObject with SkinnedMeshRenderer attached</param>
    /// <param name="decalType">Type of this Decal</param>
    /// <returns>
    /// $b$DecalExpeditor for this decalType on this obj$bb$
    /// </returns>
    /// <example>
    /// <code>
    /// RaycastHit hit;
    /// Ray ray = Camera.main.ViewportPointToRay(new Vector3(0.5F, 0.5F, 0));
    /// bool wasHit = Physics.Raycast(ray, out hit);
    /// if (wasHit)
    /// {
    ///      //If we hit character
    ///      if (hit.collider.transform.root.name == "Enemy")
    ///      {
    ///          //Find SkinnedMeshRenderer
    ///          SkinnedMeshRenderer smr = hit.collider.transform.root.GetComponentInChildren&lt;SkinnedMeshRenderer&gt;();
    ///          //Burn DecalMesh
    ///          Mesh decalMesh=DecalCreator.CreateDecalMesh(i_blood, hit.point, -hit.normal, smr.gameObject, Vector3.zero);
    ///          //Create Skinned Decal
    ///          DecalCreator.CreateDynamicSkinnedDecal(decalMesh, smr.gameObject, i_blood);
    ///      }
    /// }</code>
    /// </example>
    public static GameObject CreateDynamicSkinnedDecal(Mesh decalMesh, GameObject obj, DecalType decalType)
    {
        return CreateDynamicSkinnedDecal(decalMesh, obj, decalType, null);
    }
    /// <summary>
    /// $b$Create dynamic skinned Decal GameObject with material override$bb$
    /// </summary>
    /// <param name="decalMesh">Decal mesh in world space</param>
    /// <param name="obj">GameObject with SkinnedMeshRenderer attached</param>
    /// <param name="decalType">Type of this Decal</param>
    /// <param name="materialOverride">Material override for Decal</param>
    /// <returns>
    /// $b$DecalExpeditor for this decalType on this obj$bb$
    /// </returns>
    /// <example>
    /// <code>
    /// RaycastHit hit;
    /// Ray ray = Camera.main.ViewportPointToRay(new Vector3(0.5F, 0.5F, 0));
    /// bool wasHit = Physics.Raycast(ray, out hit);
    /// if (wasHit)
    /// {
    ///      //If we hit character
    ///      if (hit.collider.transform.root.name == "Enemy")
    ///      {
    ///          //Find SkinnedMeshRenderer
    ///          SkinnedMeshRenderer smr = hit.collider.transform.root.GetComponentInChildren&lt;SkinnedMeshRenderer&gt;();
    ///          //Burn DecalMesh
    ///          Mesh decalMesh=DecalCreator.CreateDecalMesh(i_blood, hit.point, -hit.normal, smr.gameObject, Vector3.zero);
    ///          //Create Skinned Decal
    ///          DecalCreator.CreateDynamicSkinnedDecal(decalMesh, smr.gameObject, i_blood);
    ///      }
    /// }</code>
    /// </example>
    public static GameObject CreateDynamicSkinnedDecal(Mesh decalMesh, GameObject obj, DecalType decalType, Material materialOverride)
    {
        //Profiler.BeginSample("GREATECOMBINESSKINDECAL");
        //Если нет скина выходим
        SkinnedMeshRenderer smr = obj.GetComponent<SkinnedMeshRenderer>();
        if (!smr)
        {
            throw new MissingComponentException("Game Object " + obj.name+" has no SkinnedMeshRenderer attached");
        }

        if (decalMesh.vertexCount == 0)
            return null;

        //Компонент держатель декали
        DecalHolder decalHolder = obj.GetComponent("DecalHolder") as DecalHolder;
        if (!decalHolder)
        {
            decalHolder = obj.AddComponent("DecalHolder") as DecalHolder;
        }

        //Пытаемся получить объект экспедитор
        GameObject decalTypeExpeditorObject;
        decalHolder.DecalType2DecalObject.TryGetValue(decalType, out decalTypeExpeditorObject);

        if (!decalTypeExpeditorObject)
        {
            decalTypeExpeditorObject = new GameObject("Expeditor For " + decalType.name + " DecalType");
            SkinnedMeshRenderer exSmr = decalTypeExpeditorObject.AddComponent<SkinnedMeshRenderer>();

            if (materialOverride)
                exSmr.sharedMaterial = materialOverride;
            else
                exSmr.sharedMaterial = decalType.i_material;

            //Кости
            exSmr.bones = smr.bones;
            exSmr.updateWhenOffscreen = true;

            decalTypeExpeditorObject.transform.parent = obj.transform;
            decalTypeExpeditorObject.transform.position = obj.transform.position;
            decalTypeExpeditorObject.transform.rotation = obj.transform.rotation;
            decalTypeExpeditorObject.transform.localScale = obj.transform.lossyScale;
            decalTypeExpeditorObject.layer = decalType.i_layer;

            //Экспидитор
            SkinnedDecalExpeditor sdEx=decalTypeExpeditorObject.AddComponent("SkinnedDecalExpeditor") as SkinnedDecalExpeditor;

            sdEx.SourceSMR = smr;
            sdEx.DecalType = decalType;

            decalHolder.DecalType2DecalObject.Add(decalType, decalTypeExpeditorObject);
        }
        else
        {
            //Убираем материалл ненужный если уже назначили перезаписываемый
            if (materialOverride)
                Destroy(materialOverride);
        }

        SkinnedDecalExpeditor ex = decalTypeExpeditorObject.GetComponent("SkinnedDecalExpeditor") as SkinnedDecalExpeditor;
        ex.Holder = decalHolder;

        //Трансформируем все скинированный
        decalMesh = SkinnedDecalMeshToBindPose(decalMesh, smr, decalType);
        //Отпраляем в экспедитор
        ex.PushNewDecalMesh(decalMesh);

        return decalTypeExpeditorObject;
        //Profiler.EndSample();
    }
    /// <summary>
    /// $b$ Creates fluid decal mesh and fluid game object with render sub-system$bb$
    /// </summary>
    /// <param name="decalType">Type of Decal that will be created.</param>
    /// <param name="point">Point in world space where Decal will be calculated.</param>
    /// <param name="forward">Direction of decal. Usually -hit.normal.</param>
    /// <param name="obj">GameObject on which Decal will be created.</param>
    /// <param name="materialOverride">Material override for Decal</param>
    /// <returns>
    /// $b$ Decal Object and render sub-system$bb$
    /// </returns>
    /// <example>
    /// <code>
    /// RaycastHit hit;
    /// Ray ray = Camera.main.ViewportPointToRay(new Vector3(0.5F, 0.5F, 0));
    /// bool wasHit = Physics.Raycast(ray, out hit);
    /// 
    ///  if (wasHit)
    ///         {
    ///             Material m = null;
    ///             if (hit.collider.gameObject.renderer)
    ///             {
    ///                 //Get material instanse
    ///                 m = Instantiate(i_flow.i_material) as Material;
    /// 
    ///                 //Get bump from hited surface
    /// 
    /// if(hit.collider.gameObject.renderer.sharedMaterial.HasProperty("_BumpMap"))
    ///                 {
    ///                     Texture2D bumpMap =
    /// hit.collider.gameObject.renderer.sharedMaterial.GetTexture("_BumpMap") as
    /// Texture2D;
    ///                     Vector2 bumpScale =
    /// hit.collider.gameObject.renderer.sharedMaterial.GetTextureScale("_BumpMap");
    ///                     Vector2 bumpOffset =
    /// hit.collider.gameObject.renderer.sharedMaterial.GetTextureOffset("_BumpMap");
    ///                     //Setup new bump
    ///                     m.SetTexture("_SourceBumpMap", bumpMap);
    ///                     m.SetTextureScale("_SourceBumpMap", bumpScale);
    ///                     m.SetTextureOffset("_SourceBumpMap", bumpOffset);
    ///                   }
    ///                 else
    ///                 {
    ///                      m.SetTexture("_SourceBumpMap", null);
    ///                 }
    ///                 //Flow decal
    ///                 DecalCreator.CreateFluidDecal(i_flow, hit.point, ray.direction,
    /// hit.collider.gameObject, m);
    ///             }
    ///  }
    /// </code>
    /// </example>
    public static GameObject CreateFluidDecal(DecalType decalType, Vector3 point, Vector3 forward, GameObject obj, Material materialOverride)
    {
        return CreateFluidDecal(decalType,point,forward,obj,Vector3.zero,materialOverride);
    }
    /// <summary>
    /// $b$ Creates fluid decal mesh and fluid game object with render sub-system, set
    /// directly orientation $bb$
    /// </summary>
    /// <param name="decalType">Type of Decal that will be created.</param>
    /// <param name="point">Point in world space where Decal will be calculated.</param>
    /// <param name="forward">Direction of decal. Usually -hit.normal.</param>
    /// <param name="obj">GameObject on which Decal will be created.</param>
    /// <param name="decalWoldUpVector">Decal world up vector, i.e. where top of decal
    /// mesh will be look.</param>
    /// <param name="materialOverride">Material override for Decal</param>
    /// <returns>
    /// $b$ Decal Object and render sub-system$bb$
    /// </returns>
    /// <example>
    /// <code>
    /// RaycastHit hit;
    /// Ray ray = Camera.main.ViewportPointToRay(new Vector3(0.5F, 0.5F, 0));
    /// bool wasHit = Physics.Raycast(ray, out hit);
    /// 
    ///  if (wasHit)
    ///         {
    ///             Material m = null;
    ///             if (hit.collider.gameObject.renderer)
    ///             {
    ///                 //Get material instanse
    ///                 m = Instantiate(i_flow.i_material) as Material;
    /// 
    ///                 //Get bump from hited surface
    /// 
    /// if(hit.collider.gameObject.renderer.sharedMaterial.HasProperty("_BumpMap"))
    ///                 {
    ///                     Texture2D bumpMap =
    /// hit.collider.gameObject.renderer.sharedMaterial.GetTexture("_BumpMap") as
    /// Texture2D;
    ///                     Vector2 bumpScale =
    /// hit.collider.gameObject.renderer.sharedMaterial.GetTextureScale("_BumpMap");
    ///                     Vector2 bumpOffset =
    /// hit.collider.gameObject.renderer.sharedMaterial.GetTextureOffset("_BumpMap");
    ///                     //Setup new bump
    ///                     m.SetTexture("_SourceBumpMap", bumpMap);
    ///                     m.SetTextureScale("_SourceBumpMap", bumpScale);
    ///                     m.SetTextureOffset("_SourceBumpMap", bumpOffset);
    ///                   }
    ///                 else
    ///                 {
    ///                      m.SetTexture("_SourceBumpMap", null);
    ///                 }
    ///                 //Flow decal
    ///                 DecalCreator.CreateFluidDecal(i_flow, hit.point, ray.direction,
    /// hit.collider.gameObject, m);
    ///             }
    ///  }
    /// </code>
    /// </example>
    public static GameObject CreateFluidDecal(DecalType decalType, Vector3 point, Vector3 forward, GameObject obj, Vector3 decalWoldUpVector, Material materialOverride)
    {
        if (!decalType.i_flow)
        {
            throw new Exception("Flow effect do not activated in DecalType settings, check flow toggle");
        }

        // Создаем меш
        DecalBasis decalBasis = new DecalBasis();
        Mesh decalMesh = CreateDecalMesh(decalType, point, forward, obj, decalWoldUpVector,ref decalBasis);

        if (!decalMesh || decalMesh.vertexCount == 0)
            return null;

        decalMesh.name = "Fluid Decal Mesh " + decalMesh.GetInstanceID();

        GameObject decalObject = new GameObject("Fluid Decal");
        decalObject.AddComponent<MeshFilter>();
        MeshRenderer mRenderer=decalObject.AddComponent<MeshRenderer>();
        mRenderer.material = materialOverride;
        decalObject.renderer.castShadows = false;
        decalObject.transform.position = point;
        decalObject.transform.rotation=Quaternion.LookRotation(-decalBasis.Normal, decalBasis.Binormal);
        decalObject.transform.localScale = decalType.transform.localScale+decalBasis.Rand;
        //decalObject.transform.parent = obj.transform;
        decalObject.layer = decalType.i_layer;
       

        #region Создаем объект

        if (!decalMesh || decalMesh.vertexCount == 0)
            return null;

        //В пространство объекта
        decalMesh = MeshWorldToObjectSpace(decalMesh, decalObject.transform);
        FlowDecalExpeditor flow = decalObject.AddComponent("FlowDecalExpeditor") as FlowDecalExpeditor;
        flow.DecalType = decalType;
        flow.MainTexUVParams = decalBasis.UVParams;

        decalObject.GetComponent<MeshFilter>().sharedMesh = decalMesh;
        decalMesh.RecalculateBounds();

        // Add destroyer
        DecalDestroyer destroyer = decalObject.AddComponent("DecalDestroyer") as DecalDestroyer;
        destroyer.Fade = decalType.i_fade;
        destroyer.FadingTime = decalType.i_fadingTime;
        destroyer.TimeToDestroy = decalType.i_lifeTime;

        #endregion

        return decalObject;
    }
    /// <summary>
    /// $b$Create combined meshes and GameObjects for all uncombined Static Decals$bb$
    /// </summary>
    /// <example><code>
    ///  private void Start()
    ///     {
    ///         //Combine all uncombined Decals
    ///         DecalCreator.CreateCombinedStaticDecalInGame();
    ///     }</code>
    /// </example>
    public static void CreateCombinedStaticDecalInGame()
    {
        //Создаем мировой декаль объект
        GameObject worldStaticDecalHolder = GameObject.Find("WorldStaticDecalHolder");
        if (!worldStaticDecalHolder)
            worldStaticDecalHolder = new GameObject("WorldStaticDecalHolder");

        DecalType[] decalTypes = UnityEngine.Object.FindObjectsOfType(typeof(DecalType)) as DecalType[];
        Dictionary<Material, List<DecalType>> mat2decalType = new Dictionary<Material, List<DecalType>>();

        foreach (DecalType decalType in decalTypes)
        {
            //Наполняем справочник
            if (mat2decalType.ContainsKey(decalType.renderer.sharedMaterial))
            {
                mat2decalType[decalType.renderer.sharedMaterial].Add(decalType);
            }
            else
            {
                mat2decalType.Add(decalType.renderer.sharedMaterial, new List<DecalType>());
                mat2decalType[decalType.renderer.sharedMaterial].Add(decalType);
            }

            Destroy(decalType.gameObject);
        }

        foreach (List<DecalType> list in mat2decalType.Values)
        {
            List<Mesh> meshInWorldList = new List<Mesh>();
            Material mat = null;

            foreach (DecalType decalType in list)
            {
                Mesh decalMesh = decalType.GetComponent<MeshFilter>().sharedMesh;
                if (!decalMesh)
                    continue;

                //Меш в мировое
                decalMesh = MeshObjectToWorldSpace(decalMesh, decalType.transform);

                //Наполняем лист мешей в мировом
                meshInWorldList.Add(decalMesh);
                mat = decalType.renderer.sharedMaterial;
            }

            Mesh combinedMesh = DecalCreator.CreateCombinedMesh(meshInWorldList);
            GameObject staticDecalObject = new GameObject("StaticCombinedDecal");
            staticDecalObject.transform.parent = worldStaticDecalHolder.transform;

            //В пространство объекта
            combinedMesh = MeshWorldToObjectSpace(combinedMesh, staticDecalObject.transform);

            MeshRenderer mRenderer = staticDecalObject.AddComponent<MeshRenderer>();
            mRenderer.material = mat;
            mRenderer.castShadows = false;
            MeshFilter mFilter = staticDecalObject.AddComponent<MeshFilter>();
            mFilter.sharedMesh = combinedMesh;
            mFilter.sharedMesh.RecalculateBounds();
        }

        //Возвращатем мировой держатель статичных декалей
        //return worldStaticDecalHolder;
    }           
    // Create Static Decal in Editor
    public static void CreateStaticDecal(Mesh decalMesh, GameObject obj, DecalType decalType)
    {
        if (!decalMesh || decalMesh.vertexCount == 0)
            return;

        //Если передали null то создаем декаль в мировом
        if (!obj)
        {
            obj = decalType.gameObject;
        }

        //В пространство объекта
        decalMesh = MeshWorldToObjectSpace(decalMesh, obj.transform);

        MeshFilter mFilter = obj.GetComponent<MeshFilter>();
        if (!mFilter)
            mFilter = obj.AddComponent<MeshFilter>();
        MeshRenderer mRenderer = obj.GetComponent<MeshRenderer>();
        if (!mRenderer)
            mRenderer = obj.AddComponent<MeshRenderer>();

        mFilter.sharedMesh = decalMesh;
        mRenderer.material = decalType.i_material;
        mRenderer.castShadows = false;

        decalMesh.name = "Decal " + (++DecalType.i);

        decalMesh.RecalculateBounds();
    }    
    // Create Combined decals in editor (not allow submeshes)
    public static GameObject CreateCombinedStaticDecalInEditor(List<DecalType> decalTypes, GameObject obj, bool destroyDecals)
    {
        //Если нул то в мировом комбинируем
        if (!obj)
        {
            obj = GameObject.Find("WorldStaticDecalHolder");
            if (!obj)
                obj = new GameObject("WorldStaticDecalHolder");
        }

        GameObject inactiveDecalObject = GameObject.Find("InactiveDecals");

        Dictionary<Material, List<DecalType>> mat2decalType = new Dictionary<Material, List<DecalType>>();
        foreach (DecalType decalType in decalTypes)
        {
            //Наполняем справочник
            if (mat2decalType.ContainsKey(decalType.renderer.sharedMaterial))
            {
                mat2decalType[decalType.renderer.sharedMaterial].Add(decalType);
            }
            else
            {
                mat2decalType.Add(decalType.renderer.sharedMaterial, new List<DecalType>());
                mat2decalType[decalType.renderer.sharedMaterial].Add(decalType);
            }
        }

        foreach (List<DecalType> list in mat2decalType.Values)
        {
            List<Mesh> meshInObjectList = new List<Mesh>();
            Material mat = null;

            foreach (DecalType decalType in list)
            {
                Mesh decalMesh = decalType.GetComponent<MeshFilter>().sharedMesh;
                if (!decalMesh)
                    continue;
                //Копируем меш
                Mesh decalMeshCopy = Instantiate(decalMesh) as Mesh;
                //Меш в мировое
                decalMeshCopy = MeshObjectToWorldSpace(decalMeshCopy, decalType.transform);

                //Наполняем лист мешей в мировом
                meshInObjectList.Add(decalMeshCopy);
                mat = decalType.renderer.sharedMaterial;

                //Отключаем объект или удаляем
                if (destroyDecals)
                {
                    DestroyImmediate(decalType.gameObject.GetComponent<MeshFilter>().sharedMesh);
                    DestroyImmediate(decalType.gameObject);
                }
                else
                {
                    if (inactiveDecalObject)
                    {
                        decalType.transform.parent = inactiveDecalObject.transform;
                    }
                    else
                    {
                        inactiveDecalObject = new GameObject("InactiveDecals");
                        decalType.transform.parent = inactiveDecalObject.transform;
                    }

                    decalType.gameObject.active = false;
                }
            }

            Mesh combinedMesh = DecalCreator.CreateCombinedMesh(meshInObjectList);
            GameObject staticDecalObject = new GameObject("StaticCombinedDecal");
            staticDecalObject.transform.parent = obj.transform;
            staticDecalObject.transform.localPosition = Vector3.zero;
            staticDecalObject.transform.localRotation = Quaternion.identity;

            //В пространство объекта
            combinedMesh = MeshWorldToObjectSpace(combinedMesh, staticDecalObject.transform);

            MeshRenderer mRenderer = staticDecalObject.AddComponent<MeshRenderer>();
            mRenderer.material = mat;
            mRenderer.castShadows = false;
            MeshFilter mFilter = staticDecalObject.AddComponent<MeshFilter>();
            mFilter.sharedMesh = combinedMesh;
            mFilter.sharedMesh.RecalculateBounds();

            //Удаляем копии
            foreach (Mesh mesh in meshInObjectList)
            {
                DestroyImmediate(mesh);
            }
        }

        return obj;
    }
    // Create combinned skinned decals (allow submeshes)
    public static void CreateCombinedSkinDecalInEditor(List<DecalType> decalTypes, GameObject obj, bool destroyDecals)
    {

        //Если нет скина выходим
        SkinnedMeshRenderer smr = obj.GetComponent<SkinnedMeshRenderer>();
        if (!smr)
            return;

        //Новый лист
        List<MeshSubmeshTriangles> list = new List<MeshSubmeshTriangles>();
        MeshSubmeshTriangles skinMeshSubTri = new MeshSubmeshTriangles();
        skinMeshSubTri.Mesh = smr.sharedMesh;
        for (int i = 0; i < smr.sharedMesh.subMeshCount; ++i)
        {
            skinMeshSubTri.SubmeshIndexes.Add(i);
            skinMeshSubTri.Triangles.Add(smr.sharedMesh.GetTriangles(i));
        }
        list.Add(skinMeshSubTri);

        //Все новые материаллы
        List<Material> materials = new List<Material>(smr.sharedMaterials);

        for (int i = 0; i < decalTypes.Count; ++i)
        {
            //Трансформируем все скинированные
            Mesh decalMesh = decalTypes[i].GetComponent<MeshFilter>().sharedMesh;
            decalMesh = MeshObjectToWorldSpace(decalMesh, decalTypes[i].transform);
            decalMesh = SkinnedDecalMeshToBindPose(decalMesh, smr, decalTypes[i]);

            //Декальные данные для комбинирования
            MeshSubmeshTriangles meshSubmeshTri = new MeshSubmeshTriangles();
            meshSubmeshTri.Mesh = decalMesh;

            //Индексы и материаллы
            if (materials.Contains(decalTypes[i].renderer.sharedMaterial))
            {
                int submeshIndex = materials.IndexOf(decalTypes[i].renderer.sharedMaterial);
                meshSubmeshTri.SubmeshIndexes.Add(submeshIndex);
                meshSubmeshTri.Triangles.Add(decalMesh.GetTriangles(0));
            }
            else
            {
                meshSubmeshTri.SubmeshIndexes.Add(materials.Count);
                meshSubmeshTri.Triangles.Add(decalMesh.GetTriangles(0));
                materials.Add(decalTypes[i].renderer.sharedMaterial);
            }

            //Добавляем декаль
            list.Add(meshSubmeshTri);
        }

        //Комбинируем
        Mesh combinedMesh = new Mesh();
        combinedMesh.subMeshCount = materials.Count;
        combinedMesh = CreateCombinedMesh(combinedMesh, list);
        combinedMesh.bindposes = smr.sharedMesh.bindposes;
        smr.sharedMesh = combinedMesh;
        smr.sharedMaterials = materials.ToArray();

        //Отключаем объект или удаляем
        GameObject inactiveDecalObject = GameObject.Find("InactiveDecals");
        for (int i = 0; i < decalTypes.Count; ++i)
        {
            if (destroyDecals)
            {
                DestroyImmediate(decalTypes[i].gameObject.GetComponent<MeshFilter>().sharedMesh);
                DestroyImmediate(decalTypes[i].gameObject);
            }
            else
            {
                if (inactiveDecalObject)
                {
                    decalTypes[i].transform.parent = inactiveDecalObject.transform;
                }
                else
                {
                    inactiveDecalObject = new GameObject("InactiveDecals");
                    decalTypes[i].transform.parent = inactiveDecalObject.transform;
                }

                decalTypes[i].gameObject.active = false;
            }
        }
    } 
    // Create combinned mesh 
    public static Mesh CreateCombinedMesh(List<Mesh> meshes)
    {
        //Profiler.BeginSample("COMBINEMESHES");

        if (meshes.Count < 1)
            return null;

        Mesh combinedMesh = new Mesh();
        combinedMesh.name = "Combined Decal Mesh";

        int lenght = 0;
        int trianglesLength = 0;

        foreach (Mesh decalMesh in meshes)
        {
            lenght += decalMesh.vertexCount;
            trianglesLength += decalMesh.triangles.Length;
        }

        Vector3[] vertices = new Vector3[lenght];
        Vector3[] normals = new Vector3[lenght];
        Vector4[] tangents = new Vector4[lenght];
        Vector2[] uv = new Vector2[lenght];
        Vector2[] uv2 = new Vector2[lenght];
        Color[] colors = new Color[lenght];
        int[] triangles = new int[trianglesLength];
        BoneWeight[] boneWeights = new BoneWeight[lenght];

        int vertexOffset = 0;
        int triangleOffset = 0;

         //первый меш в массиве
        Mesh firstMesh = meshes[0];

        bool needuv = (firstMesh.uv2.Length > 0);
        bool needcolors = (firstMesh.colors.Length > 0);
        bool needboneweights = (firstMesh.boneWeights.Length > 0);

        //Meshes
        for (int i = 0; i < meshes.Count; ++i)
        {
            Vector3[] verticesDecal = meshes[i].vertices;
            Vector3[] normalsDecal = meshes[i].normals;
            Vector4[] tangentsDecal = meshes[i].tangents;
            Vector2[] uvDecal = meshes[i].uv;
            Vector2[] uv2Decal = meshes[i].uv2;
            Color[] colorsDecal = meshes[i].colors;
            int[] trianglesDecal = meshes[i].triangles;
            BoneWeight[] boneWeightDecal = meshes[i].boneWeights;

            //Vertex
            for (int j = 0; j < verticesDecal.Length; ++j)
            {
                vertices[j + vertexOffset] = verticesDecal[j];
            }
            //Normals
            for (int j = 0; j < normalsDecal.Length; ++j)
            {
                normals[j + vertexOffset] = normalsDecal[j];
            }
            //Tangents
            for (int j = 0; j < tangentsDecal.Length; ++j)
            {
                tangents[j + vertexOffset] = tangentsDecal[j];
            }
            //UV
            for (int j = 0; j < uvDecal.Length; ++j)
            {
                uv[j + vertexOffset] = uvDecal[j];
            }
            //UV2
            if (needuv)
            {
                for (int j = 0; j < uv2Decal.Length; ++j)
                {
                    uv2[j + vertexOffset] = uv2Decal[j];
                }
            }
            //Color
            if (needcolors)
            {
                for (int j = 0; j < colorsDecal.Length; ++j)
                {
                    colors[j + vertexOffset] = colorsDecal[j];
                }
            }
            //BoneWeight
            if (needboneweights)
            {
                for (int j = 0; j < boneWeightDecal.Length; ++j)
                {
                    boneWeights[j + vertexOffset] = boneWeightDecal[j];
                }
            }
            //Triangles
            for (int j = 0; j < trianglesDecal.Length; ++j)
            {
                triangles[j + triangleOffset] = trianglesDecal[j] + vertexOffset;
            }

            triangleOffset += trianglesDecal.Length;
            vertexOffset += verticesDecal.Length;
        }

        combinedMesh.vertices = vertices;
        combinedMesh.normals = normals;
        combinedMesh.tangents = tangents;
        combinedMesh.uv = uv;
        if (needuv)
        {
            combinedMesh.uv2 = uv2;
        }
        else
        {
            combinedMesh.uv2 = null;
        }
        if (needcolors)
        {
            combinedMesh.colors = colors;
        }
        else
        {
            combinedMesh.colors = null;
        }
        if (needboneweights)
        {
            combinedMesh.boneWeights = boneWeights;
        }
        else
        {
            combinedMesh.boneWeights = null;
        }
        combinedMesh.triangles = triangles;

        //Profiler.EndSample();

        return combinedMesh;
    }
    // Create combinned mesh (with submeshes)
    public static Mesh CreateCombinedMesh(Mesh combinedMesh, List<MeshSubmeshTriangles> meshSubmeshTriangles)
    {
        if (meshSubmeshTriangles.Count < 2)
            return combinedMesh;

        combinedMesh.name = "Combined Skinned Mesh";

        int lenght = 0;

        //Обработанные меши
        foreach (MeshSubmeshTriangles mst in meshSubmeshTriangles)
        {
            lenght += mst.Mesh.vertexCount;
        }

        Vector3[] vertices = new Vector3[lenght];
        Vector3[] normals = new Vector3[lenght];
        Vector4[] tangents = new Vector4[lenght];
        Vector2[] uv = new Vector2[lenght];
        Vector2[] uv2 = new Vector2[lenght];
        Color[] colors = new Color[lenght];
        BoneWeight[] boneWeights = new BoneWeight[lenght];

        int vertexOffset = 0;
        int triangleOffset = 0;

        //SecondMesh
        Mesh secondMesh = meshSubmeshTriangles[1].Mesh;

        //Meshes
        for (int i = 0; i < meshSubmeshTriangles.Count; ++i)
        {
            Vector3[] verticesDecal = meshSubmeshTriangles[i].Mesh.vertices;
            Vector3[] normalsDecal = meshSubmeshTriangles[i].Mesh.normals;
            Vector4[] tangentsDecal = meshSubmeshTriangles[i].Mesh.tangents;
            Vector2[] uvDecal = meshSubmeshTriangles[i].Mesh.uv;
            Vector2[] uv2Decal = meshSubmeshTriangles[i].Mesh.uv2;
            Color[] colorsDecal = meshSubmeshTriangles[i].Mesh.colors;
            int[] trianglesDecal = meshSubmeshTriangles[i].Mesh.triangles;
            BoneWeight[] boneWeightDecal = meshSubmeshTriangles[i].Mesh.boneWeights;

            //Vertex
            for (int j = 0; j < verticesDecal.Length; ++j)
            {
                vertices[j + vertexOffset] = verticesDecal[j];
            }
            //Normals
            for (int j = 0; j < normalsDecal.Length; ++j)
            {
                normals[j + vertexOffset] = normalsDecal[j];
            }
            //Tangents
            for (int j = 0; j < tangentsDecal.Length; ++j)
            {
                tangents[j + vertexOffset] = tangentsDecal[j];
            }
            //UV
            for (int j = 0; j < uvDecal.Length; ++j)
            {
                uv[j + vertexOffset] = uvDecal[j];
            }
            //UV2
            if (secondMesh.uv2.Length > 0)
            {
                for (int j = 0; j < uv2Decal.Length; ++j)
                {
                    uv2[j + vertexOffset] = uv2Decal[j];
                }
            }
            //Color
            if (secondMesh.colors.Length > 0)
            {
                for (int j = 0; j < colorsDecal.Length; ++j)
                {
                    colors[j + vertexOffset] = colorsDecal[j];
                }
            }
            //BoneWeight
            for (int j = 0; j < boneWeightDecal.Length; ++j)
            {
                boneWeights[j + vertexOffset] = boneWeightDecal[j];
            }

            //Смещаем трианглы
            if (i > 0)
            {
                foreach (int[] triangles in meshSubmeshTriangles[i].Triangles)
                {
                    //Смещаем 
                    for (int t = 0; t < triangles.Length; ++t)
                    {
                        triangles[t] += vertexOffset;
                    }
                }
            }

            triangleOffset += trianglesDecal.Length;
            vertexOffset += verticesDecal.Length;
        }

        combinedMesh.vertices = vertices;
        combinedMesh.normals = normals;
        combinedMesh.tangents = tangents;
        combinedMesh.uv = uv;
        if (secondMesh.uv2.Length > 0)
        {
            combinedMesh.uv2 = uv2;
        }
        else
        {
            combinedMesh.uv2 = null;
        }
        if (secondMesh.colors.Length > 0)
        {
            combinedMesh.colors = colors;
        }
        else
        {
            combinedMesh.colors = null;
        }
        combinedMesh.boneWeights = boneWeights;

        //Назначаем трианглы
        List<int> processedIndexes = new List<int>();
        foreach (MeshSubmeshTriangles meshSubTri in meshSubmeshTriangles)
        {
            for (int i = 0; i < meshSubTri.SubmeshIndexes.Count; ++i)
            {
                if (!processedIndexes.Contains(meshSubTri.SubmeshIndexes[i]))
                {
                    combinedMesh.SetTriangles(meshSubTri.Triangles[i], meshSubTri.SubmeshIndexes[i]);
                    processedIndexes.Add(meshSubTri.SubmeshIndexes[i]);
                }
                else//Если такой индекс уже заполнен соединяем два массива
                {
                    int[] triangles = combinedMesh.GetTriangles(meshSubTri.SubmeshIndexes[i]);
                    List<int> summTriangles = new List<int>();
                    summTriangles.AddRange(triangles);
                    summTriangles.AddRange(meshSubTri.Triangles[i]);
                    combinedMesh.SetTriangles(summTriangles.ToArray(), meshSubTri.SubmeshIndexes[i]);
                }
            }
        }

        return combinedMesh;
    }
    // Create planes
    public static Plane[] CreatePlanes(DecalType decalType)
    {
        Plane[] planes = new Plane[6];
        //Left
        planes[0] = new Plane(decalType.transform.right, decalType.transform.position - decalType.transform.right * decalType.transform.localScale.x / 2);
        //Right
        planes[1] = new Plane(-decalType.transform.right, decalType.transform.position + decalType.transform.right * decalType.transform.localScale.x / 2);
        //Bottom
        planes[2] = new Plane(decalType.transform.up, decalType.transform.position - decalType.transform.up * decalType.transform.localScale.y / 2);
        //Top
        planes[3] = new Plane(-decalType.transform.up, decalType.transform.position + decalType.transform.up * decalType.transform.localScale.y / 2);
        //Back
        planes[4] = new Plane(decalType.transform.forward, decalType.transform.position - decalType.transform.forward * decalType.transform.localScale.z / 2);
        //Front
        planes[5] = new Plane(-decalType.transform.forward, decalType.transform.position + decalType.transform.forward * decalType.transform.localScale.z / 2);

        return planes;
    }
    // AABB testing
    public static bool VolumeTesting(DecalType decalType,Bounds bounds)
    {

        Vector3 Tangent = -decalType.transform.right;
        Vector3 Binormal = decalType.transform.up;
        Vector3 Normal = -decalType.transform.forward;
        Vector3 decalSize = decalType.transform.localScale;
        Vector3 Point = decalType.transform.position;

        //Создаем уравнения плоскостей
        List<Vector4> planes = new List<Vector4>(6);
        planes.Add(new Vector4(Tangent.x, Tangent.y, Tangent.z, decalSize.x / 2 - Vector3.Dot(Tangent, Point)));
        planes.Add(new Vector4(-Tangent.x, -Tangent.y, -Tangent.z, decalSize.x / 2 + Vector3.Dot(Tangent, Point)));
        planes.Add(new Vector4(Binormal.x, Binormal.y, Binormal.z, decalSize.y / 2 - Vector3.Dot(Binormal, Point)));
        planes.Add(new Vector4(-Binormal.x, -Binormal.y, -Binormal.z, decalSize.y / 2 + Vector3.Dot(Binormal, Point)));
        planes.Add(new Vector4(-Normal.x, -Normal.y, -Normal.z, decalSize.z / 2 + Vector3.Dot(Normal, Point)));
        planes.Add(new Vector4(Normal.x, Normal.y, Normal.z, decalSize.z / 2 - Vector3.Dot(Normal, Point)));

        //Точки боундинга
        List<Vector4> vectors = new List<Vector4>(8);
        vectors.Add(new Vector4(bounds.min.x, bounds.min.y, bounds.min.z, 1));
        vectors.Add(new Vector4(bounds.max.x, bounds.min.y, bounds.min.z, 1));
        vectors.Add(new Vector4(bounds.min.x, bounds.max.y, bounds.min.z, 1));
        vectors.Add(new Vector4(bounds.max.x, bounds.max.y, bounds.min.z, 1));
        vectors.Add(new Vector4(bounds.min.x, bounds.min.y, bounds.max.z, 1));
        vectors.Add(new Vector4(bounds.max.x, bounds.min.y, bounds.max.z, 1));
        vectors.Add(new Vector4(bounds.min.x, bounds.max.y, bounds.max.z, 1));
        vectors.Add(new Vector4(bounds.max.x, bounds.max.y, bounds.max.z, 1));


        foreach (Vector4 v in vectors)
        {
            float dot1 = Vector4.Dot(planes[0], v);
            float dot2 = Vector4.Dot(planes[1], v);
            float dot3 = Vector4.Dot(planes[2], v);
            float dot4 = Vector4.Dot(planes[3], v);
            float dot5 = Vector4.Dot(planes[4], v);
            float dot6 = Vector4.Dot(planes[5], v);

            //Если хоть одна внутри
            if (dot1 >= 0 && dot2 >= 0 && dot3 >= 0 && dot4 >= 0 && dot5 >= 0 && dot6 >= 0)
                return true;
        }

        //Точки фруструма
        List<Vector3> frustrumPoints = new List<Vector3>(8);
        frustrumPoints.Add(Point + Tangent * decalSize.x / 2 + Binormal * decalSize.y / 2 + Normal * decalSize.z / 2);
        frustrumPoints.Add(Point - Tangent * decalSize.x / 2 - Binormal * decalSize.y / 2 - Normal * decalSize.z / 2);
        frustrumPoints.Add(Point - Tangent * decalSize.x / 2 + Binormal * decalSize.y / 2 + Normal * decalSize.z / 2);
        frustrumPoints.Add(Point + Tangent * decalSize.x / 2 - Binormal * decalSize.y / 2 - Normal * decalSize.z / 2);
        frustrumPoints.Add(Point + Tangent * decalSize.x / 2 - Binormal * decalSize.y / 2 + Normal * decalSize.z / 2);
        frustrumPoints.Add(Point - Tangent * decalSize.x / 2 + Binormal * decalSize.y / 2 - Normal * decalSize.z / 2);
        frustrumPoints.Add(Point + Tangent * decalSize.x / 2 + Binormal * decalSize.y / 2 - Normal * decalSize.z / 2);
        frustrumPoints.Add(Point - Tangent * decalSize.x / 2 - Binormal * decalSize.y / 2 + Normal * decalSize.z / 2);

        foreach (Vector3 vec in frustrumPoints)
        {
            if (bounds.Contains(vec))
                return true;
        }

        //Для плоскости
        if (bounds.size.x == 0 || bounds.size.y == 0 || bounds.size.z == 0)
        {
            //Лучи между углами
            float dist = 0;

            if (bounds.IntersectRay(new Ray(frustrumPoints[0], frustrumPoints[1] - frustrumPoints[0]), out dist) && dist <= (frustrumPoints[1] - frustrumPoints[0]).magnitude)
                return true;
            if (bounds.IntersectRay(new Ray(frustrumPoints[2], frustrumPoints[3] - frustrumPoints[2]), out dist) && dist <= (frustrumPoints[3] - frustrumPoints[2]).magnitude)
                return true;
            if (bounds.IntersectRay(new Ray(frustrumPoints[4], frustrumPoints[5] - frustrumPoints[4]), out dist) && dist <= (frustrumPoints[5] - frustrumPoints[4]).magnitude)
                return true;
            if (bounds.IntersectRay(new Ray(frustrumPoints[6], frustrumPoints[7] - frustrumPoints[6]), out dist) && dist <= (frustrumPoints[7] - frustrumPoints[6]).magnitude)
                return true;
        }

        return false;
    }


    // BASE CREATE DECAL MESH
    private static Mesh CreateDecalMesh(DecalType decalType, Vector3 point, Vector3 forward, GameObject obj, Vector3 decalWoldUpVector, ref DecalBasis decalBasis)
    {
        //Инвертируем потому что расчет идет по нормали от поверхности
        forward = -forward;

        //Profiler.BeginSample("CREATEDECALMESH");
        //Создаем меш если нет кидаем эксепшн
        Mesh colliderMesh = null;
        Transform transform = null;
        SkinnedMeshRenderer sMeshRenderer = obj.GetComponent<SkinnedMeshRenderer>();
        if (sMeshRenderer)
        {
            //Полностью скинированный меш в мировом
            colliderMesh = GetFullSkinnedMesh(sMeshRenderer, decalType);
        }
        else
        {
            MeshFilter mFilter = obj.GetComponent<MeshFilter>();
            if (mFilter)
            {
                if (!Application.isPlaying)
                {
                    colliderMesh = Instantiate(mFilter.sharedMesh) as Mesh;
                }
                else
                {
                    colliderMesh = Instantiate(mFilter.mesh) as Mesh;
                }
            }
            transform = obj.transform;
        }

        if (!colliderMesh)
            return null;

        //Обрезаем ненужную часть
        Mesh cutedDecalMesh = SimplifyMesh(transform, forward, decalType, colliderMesh);
        //Без упрощения
        //Mesh cutedDecalMesh = colliderMesh;

        //В мировое пространство если не скинированный меш
        if (!sMeshRenderer)
            cutedDecalMesh = MeshObjectToWorldSpace(cutedDecalMesh, transform);

        //Создаем основные векторы
        Vector3 Point = point;
        Vector3 Normal = forward.normalized;
        Vector3 Tangent = Vector3.zero;
        Vector3 Binormal = Vector3.zero;
        //Если в едиторе то базис фиксированный
        if (!Application.isPlaying)
        {
            Tangent = -decalType.transform.right;
            Binormal = decalType.transform.up;
        }
        else
        {
            if (decalWoldUpVector == Vector3.zero)//Случайный
            {
                Tangent = UnityEngine.Random.onUnitSphere;
            }
            else
            {
                Tangent = Vector3.Cross(decalWoldUpVector, Normal);
            }
            Vector3.OrthoNormalize(ref Normal, ref Tangent);
            Binormal = Vector3.Cross(Normal, Tangent);
        }
        decalBasis.Normal = Normal;
        decalBasis.Tangent = Tangent;
        decalBasis.Binormal = Binormal;

        //Дебажим
        //StartCoroutine(BasisDebug(Point, Normal, Tangent, Binormal));

        //Генерация случайности
        Vector3 rand = Vector3.zero;
        Vector3 decalSize = Vector3.zero;
        if (Application.isPlaying && decalType.i_randomMode != RandomMode.None)
        {
            if (decalType.i_randomMode == RandomMode.PerComponent)
                rand = new Vector3(UnityEngine.Random.Range(-1.0F, 1.0F) * decalType.i_randomVector.x, UnityEngine.Random.Range(-1.0F, 1.0F) * decalType.i_randomVector.y, UnityEngine.Random.Range(-1.0F, 1.0F) * decalType.i_randomVector.z);
            else
                rand = new Vector3(decalType.i_randomSize, decalType.i_randomSize, decalType.i_randomSize) * UnityEngine.Random.Range(-1.0F, 1.0F);

            decalSize = decalType.transform.localScale + rand;
            decalBasis.Rand = rand;
        }
        else
        {
            decalSize = decalType.transform.localScale;
        }

        //Создаем уравнения плоскостей
        Vector4 Left = new Vector4(Tangent.x, Tangent.y, Tangent.z, decalSize.x / 2 - Vector3.Dot(Tangent, Point));
        Vector4 Right = new Vector4(-Tangent.x, -Tangent.y, -Tangent.z, decalSize.x / 2 + Vector3.Dot(Tangent, Point));
        Vector4 Bottom = new Vector4(Binormal.x, Binormal.y, Binormal.z, decalSize.y / 2 - Vector3.Dot(Binormal, Point));
        Vector4 Top = new Vector4(-Binormal.x, -Binormal.y, -Binormal.z, decalSize.y / 2 + Vector3.Dot(Binormal, Point));
        Vector4 Front = new Vector4(-Normal.x, -Normal.y, -Normal.z, decalSize.z / 2 + Vector3.Dot(Normal, Point));
        Vector4 Back = new Vector4(Normal.x, Normal.y, Normal.z, decalSize.z / 2 - Vector3.Dot(Normal, Point));

        //Все плоскости
        List<Vector4> planes = new List<Vector4>();
        planes.Add(Left);
        planes.Add(Right);
        planes.Add(Bottom);
        planes.Add(Top);
        planes.Add(Front);
        planes.Add(Back);

        //Берем массивы
        List<int> triangles = new List<int>();
        triangles.AddRange(cutedDecalMesh.triangles);
        List<Vector3> vertexes = new List<Vector3>();
        vertexes.AddRange(cutedDecalMesh.vertices);
        List<Vector3> normals = new List<Vector3>();
        normals.AddRange(cutedDecalMesh.normals);
        List<Vector4> tangents = new List<Vector4>();
        tangents.AddRange(cutedDecalMesh.tangents);
        List<Vector2> uv = new List<Vector2>();
        uv.AddRange(cutedDecalMesh.uv);

        List<BoneWeight> boneWeights = new List<BoneWeight>();
        if (decalType.i_boneWeights)
        {
            boneWeights.AddRange(cutedDecalMesh.boneWeights);
        }

        //Profiler.BeginSample("TRIANGLETEST");
        #region ТЕСТИРУЕМ

        //Временные дополнительные переменные
        //Vector2 Luv1 = new Vector2();
        //Vector2 Luv2 = new Vector2();
        //Vector2 Luv3 = new Vector2();
        //Vector2 Luv12 = new Vector2();
        //Vector2 Luv13 = new Vector2();
        //Vector2 Luv21 = new Vector2();
        //Vector2 Luv23 = new Vector2();
        //Vector2 Luv32 = new Vector2();
        //Vector2 Luv31 = new Vector2();
        
        BoneWeight boneWeight1 = new BoneWeight();
        BoneWeight boneWeight2 = new BoneWeight();
        BoneWeight boneWeight3 = new BoneWeight();
        BoneWeight boneWeight12 = new BoneWeight();
        BoneWeight boneWeight13 = new BoneWeight();
        BoneWeight boneWeight21 = new BoneWeight();
        BoneWeight boneWeight23 = new BoneWeight();
        BoneWeight boneWeight32 = new BoneWeight();
        BoneWeight boneWeight31 = new BoneWeight();


        foreach (Vector4 plane in planes)
        {
            //Создаем массивы для декали
            List<int> decalTriangles = new List<int>();
            List<Vector3> decalVertex = new List<Vector3>();
            List<Vector3> decalNormals = new List<Vector3>();
            List<Vector4> decalTangents = new List<Vector4>();
            List<Vector2> decalUV = new List<Vector2>();
            //List<Color> decalColors = new List<Color>();
            List<BoneWeight> decalBoneWeights = new List<BoneWeight>();

            for (int i = 0; i < triangles.Count; i += 3)
            {
                //Получаем вертексы триангла
                Vector4 vert1 = vertexes[triangles[i]];
                Vector4 vert2 = vertexes[triangles[i + 1]];
                Vector4 vert3 = vertexes[triangles[i + 2]];
                vert1.w = vert2.w = vert3.w = 1;
                Vector3 norm1 = normals[triangles[i]];
                Vector3 norm2 = normals[triangles[i + 1]];
                Vector3 norm3 = normals[triangles[i + 2]];
                Vector4 tan1 = tangents[triangles[i]];
                Vector4 tan2 = tangents[triangles[i + 1]];
                Vector4 tan3 = tangents[triangles[i + 2]];
                Vector2 uv1 = uv[triangles[i]];
                Vector2 uv2 = uv[triangles[i + 1]];
                Vector2 uv3 = uv[triangles[i + 2]];


                if (decalType.i_boneWeights)
                {
                    boneWeight1 = boneWeights[triangles[i]];
                    boneWeight2 = boneWeights[triangles[i + 1]];
                    boneWeight3 = boneWeights[triangles[i + 2]];
                }

                //Left testing
                float vertDot1 = Vector4.Dot(plane, vert1);
                float vertDot2 = Vector4.Dot(plane, vert2);
                float vertDot3 = Vector4.Dot(plane, vert3);

                //First case
                if (vertDot1 < 0 && vertDot2 < 0 && vertDot3 < 0)
                {
                    continue;
                }
                //Second case
                else if (vertDot1 >= 0 && vertDot2 >= 0 && vertDot3 >= 0)
                {
                    ///Добавляем в массивы
                    decalTriangles.Add(decalTriangles.Count);
                    decalTriangles.Add(decalTriangles.Count);
                    decalTriangles.Add(decalTriangles.Count);
                    decalVertex.Add(vert1);
                    decalVertex.Add(vert2);
                    decalVertex.Add(vert3);
                    decalNormals.Add(norm1);
                    decalNormals.Add(norm2);
                    decalNormals.Add(norm3);
                    decalTangents.Add(tan1);
                    decalTangents.Add(tan2);
                    decalTangents.Add(tan3);
                    decalUV.Add(uv1);
                    decalUV.Add(uv2);
                    decalUV.Add(uv3);

                    if (decalType.i_boneWeights)
                    {
                        decalBoneWeights.Add(boneWeight1);
                        decalBoneWeights.Add(boneWeight2);
                        decalBoneWeights.Add(boneWeight3);
                    }
                }

                ///Intersection//////////////////////////////
                #region < > > | > < <
                else if ((vertDot1 < 0 && vertDot2 >= 0 && vertDot3 >= 0) || (vertDot1 >= 0 && vertDot2 < 0 && vertDot3 < 0))
                {
                    //Дополнительные точки
                    Vector4 vert12 = new Vector4();
                    Vector4 vert13 = new Vector4();
                    vert12.w = vert13.w = 1;
                    Vector3 norm12 = new Vector3();
                    Vector3 norm13 = new Vector3();
                    Vector4 tan12 = new Vector4();
                    Vector4 tan13 = new Vector4();
                    Vector2 uv12 = new Vector2();
                    Vector2 uv13 = new Vector2();

                    //Коэффициенты интерполяции
                    float t12 = -vertDot1 / (vertDot2 - vertDot1);
                    float t13 = -vertDot1 / (vertDot3 - vertDot1);

                    //Создаем все промежуточные векторы
                    vert12 = vert1 + (vert2 - vert1) * t12;
                    vert13 = vert1 + (vert3 - vert1) * t13;
                    norm12 = norm1 + (norm2 - norm1) * t12;
                    norm13 = norm1 + (norm3 - norm1) * t13;
                    tan12 = tan1 + (tan2 - tan1) * t12;
                    tan13 = tan1 + (tan3 - tan1) * t13;
                    uv12 = uv1 + (uv2 - uv1) * t12;
                    uv13 = uv1 + (uv3 - uv1) * t13;

                    if (decalType.i_uv2)
                    {
                        //Luv12 = Luv1 + (Luv2 - Luv1) * t12;
                        //Luv13 = Luv1 + (Luv3 - Luv1) * t13;
                    }
                    if (decalType.i_boneWeights)
                    {
                        boneWeight12 = BoneWeightLerp(boneWeight1, boneWeight2, t12);
                        boneWeight13 = BoneWeightLerp(boneWeight1, boneWeight3, t13);
                    }

                    if (vertDot1 < 0)
                    {
                        ///Добавляем первый треугольник
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalVertex.Add(vert12);
                        decalVertex.Add(vert2);
                        decalVertex.Add(vert3);
                        decalNormals.Add(norm12);
                        decalNormals.Add(norm2);
                        decalNormals.Add(norm3);
                        decalTangents.Add(tan12);
                        decalTangents.Add(tan2);
                        decalTangents.Add(tan3);
                        decalUV.Add(uv12);
                        decalUV.Add(uv2);
                        decalUV.Add(uv3);

                        if (decalType.i_boneWeights)
                        {
                            decalBoneWeights.Add(boneWeight12);
                            decalBoneWeights.Add(boneWeight2);
                            decalBoneWeights.Add(boneWeight3);
                        }

                        ///Добавляем второй треугольник
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalVertex.Add(vert12);
                        decalVertex.Add(vert3);
                        decalVertex.Add(vert13);
                        decalNormals.Add(norm12);
                        decalNormals.Add(norm3);
                        decalNormals.Add(norm13);
                        decalTangents.Add(tan12);
                        decalTangents.Add(tan3);
                        decalTangents.Add(tan13);
                        decalUV.Add(uv12);
                        decalUV.Add(uv3);
                        decalUV.Add(uv13);

                        if (decalType.i_boneWeights)
                        {
                            decalBoneWeights.Add(boneWeight12);
                            decalBoneWeights.Add(boneWeight3);
                            decalBoneWeights.Add(boneWeight13);
                        }
                    }
                    else//Если нет то добавляем другой треугольник
                    {
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalVertex.Add(vert1);
                        decalVertex.Add(vert12);
                        decalVertex.Add(vert13);
                        decalNormals.Add(norm1);
                        decalNormals.Add(norm12);
                        decalNormals.Add(norm13);
                        decalTangents.Add(tan1);
                        decalTangents.Add(tan12);
                        decalTangents.Add(tan13);
                        decalUV.Add(uv1);
                        decalUV.Add(uv12);
                        decalUV.Add(uv13);

                        if (decalType.i_boneWeights)
                        {
                            decalBoneWeights.Add(boneWeight1);
                            decalBoneWeights.Add(boneWeight12);
                            decalBoneWeights.Add(boneWeight13);
                        }
                    }
                }
                #endregion
                #region > < > | < > <
                else if ((vertDot1 >= 0 && vertDot2 < 0 && vertDot3 >= 0) || (vertDot1 < 0 && vertDot2 >= 0 && vertDot3 < 0))
                {
                    //Дополнительные точки
                    Vector4 vert21 = new Vector4();
                    Vector4 vert23 = new Vector4();
                    vert21.w = vert23.w = 1;
                    Vector3 norm21 = new Vector3();
                    Vector3 norm23 = new Vector3();
                    Vector4 tan21 = new Vector4();
                    Vector4 tan23 = new Vector4();
                    Vector2 uv21 = new Vector2();
                    Vector2 uv23 = new Vector2();

                    //Коэффициенты интерполяции
                    float t21 = -vertDot2 / (vertDot1 - vertDot2);
                    float t23 = -vertDot2 / (vertDot3 - vertDot2);

                    //Создаем все промежуточные векторы
                    vert21 = vert2 + (vert1 - vert2) * t21;
                    vert23 = vert2 + (vert3 - vert2) * t23;
                    norm21 = norm2 + (norm1 - norm2) * t21;
                    norm23 = norm2 + (norm3 - norm2) * t23;
                    tan21 = tan2 + (tan1 - tan2) * t21;
                    tan23 = tan2 + (tan3 - tan2) * t23;
                    uv21 = uv2 + (uv1 - uv2) * t21;
                    uv23 = uv2 + (uv3 - uv2) * t23;

                    if (decalType.i_uv2)
                    {
                        //Luv21 = Luv2 + (Luv1 - Luv2) * t21;
                        //Luv23 = Luv2 + (Luv3 - Luv2) * t23;
                    }
                    if (decalType.i_boneWeights)
                    {
                        boneWeight21 = BoneWeightLerp(boneWeight2, boneWeight1, t21);
                        boneWeight23 = BoneWeightLerp(boneWeight2, boneWeight3, t23);
                    }

                    if (vertDot1 >= 0)
                    {
                        ///Добавляем первый треугольник
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalVertex.Add(vert1);
                        decalVertex.Add(vert21);
                        decalVertex.Add(vert3);
                        decalNormals.Add(norm1);
                        decalNormals.Add(norm21);
                        decalNormals.Add(norm3);
                        decalTangents.Add(tan1);
                        decalTangents.Add(tan21);
                        decalTangents.Add(tan3);
                        decalUV.Add(uv1);
                        decalUV.Add(uv21);
                        decalUV.Add(uv3);

                        if (decalType.i_boneWeights)
                        {
                            decalBoneWeights.Add(boneWeight1);
                            decalBoneWeights.Add(boneWeight21);
                            decalBoneWeights.Add(boneWeight3);
                        }

                        ///Добавляем второй треугольник
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalVertex.Add(vert3);
                        decalVertex.Add(vert21);
                        decalVertex.Add(vert23);
                        decalNormals.Add(norm3);
                        decalNormals.Add(norm21);
                        decalNormals.Add(norm23);
                        decalTangents.Add(tan3);
                        decalTangents.Add(tan21);
                        decalTangents.Add(tan23);
                        decalUV.Add(uv3);
                        decalUV.Add(uv21);
                        decalUV.Add(uv23);

                        if (decalType.i_boneWeights)
                        {
                            decalBoneWeights.Add(boneWeight3);
                            decalBoneWeights.Add(boneWeight21);
                            decalBoneWeights.Add(boneWeight23);
                        }
                    }
                    else
                    {
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalVertex.Add(vert2);
                        decalVertex.Add(vert23);
                        decalVertex.Add(vert21);
                        decalNormals.Add(norm2);
                        decalNormals.Add(norm23);
                        decalNormals.Add(norm21);
                        decalTangents.Add(tan2);
                        decalTangents.Add(tan23);
                        decalTangents.Add(tan21);
                        decalUV.Add(uv2);
                        decalUV.Add(uv23);
                        decalUV.Add(uv21);

                        if (decalType.i_boneWeights)
                        {
                            decalBoneWeights.Add(boneWeight2);
                            decalBoneWeights.Add(boneWeight23);
                            decalBoneWeights.Add(boneWeight21);
                        }
                    }
                }
                #endregion
                #region > > < | < < >
                else if ((vertDot1 >= 0 && vertDot2 >= 0 && vertDot3 < 0) || (vertDot1 < 0 && vertDot2 < 0 && vertDot3 >= 0))
                {
                    //Дополнительные точки
                    Vector4 vert32 = new Vector4();
                    Vector4 vert31 = new Vector4();
                    vert32.w = vert31.w = 1;
                    Vector3 norm32 = new Vector3();
                    Vector3 norm31 = new Vector3();
                    Vector4 tan32 = new Vector4();
                    Vector4 tan31 = new Vector4();
                    Vector2 uv32 = new Vector2();
                    Vector2 uv31 = new Vector2();

                    //Коэффициенты интерполяции
                    float t32 = -vertDot3 / (vertDot2 - vertDot3);
                    float t31 = -vertDot3 / (vertDot1 - vertDot3);

                    //Создаем все промежуточные векторы
                    vert32 = vert3 + (vert2 - vert3) * t32;
                    vert31 = vert3 + (vert1 - vert3) * t31;
                    norm32 = norm3 + (norm2 - norm3) * t32;
                    norm31 = norm3 + (norm1 - norm3) * t31;
                    tan32 = tan3 + (tan2 - tan3) * t32;
                    tan31 = tan3 + (tan1 - tan3) * t31;
                    uv32 = uv3 + (uv2 - uv3) * t32;
                    uv31 = uv3 + (uv1 - uv3) * t31;

                    if (decalType.i_uv2)
                    {
                        //Luv32 = Luv3 + (Luv2 - Luv3) * t32;
                        //Luv31 = Luv3 + (Luv1 - Luv3) * t31;
                    }
                    if (decalType.i_boneWeights)
                    {
                        boneWeight32 = BoneWeightLerp(boneWeight3, boneWeight2, t32);
                        boneWeight31 = BoneWeightLerp(boneWeight3, boneWeight1, t31);
                    }

                    if (vertDot1 >= 0)
                    {
                        ///Добавляем первый треугольник
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalVertex.Add(vert1);
                        decalVertex.Add(vert2);
                        decalVertex.Add(vert32);
                        decalNormals.Add(norm1);
                        decalNormals.Add(norm2);
                        decalNormals.Add(norm32);
                        decalTangents.Add(tan1);
                        decalTangents.Add(tan2);
                        decalTangents.Add(tan32);
                        decalUV.Add(uv1);
                        decalUV.Add(uv2);
                        decalUV.Add(uv32);

                        if (decalType.i_boneWeights)
                        {
                            decalBoneWeights.Add(boneWeight1);
                            decalBoneWeights.Add(boneWeight2);
                            decalBoneWeights.Add(boneWeight32);
                        }

                        ///Добавляем второй треугольник
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalVertex.Add(vert1);
                        decalVertex.Add(vert32);
                        decalVertex.Add(vert31);
                        decalNormals.Add(norm1);
                        decalNormals.Add(norm32);
                        decalNormals.Add(norm31);
                        decalTangents.Add(tan1);
                        decalTangents.Add(tan32);
                        decalTangents.Add(tan31);
                        decalUV.Add(uv1);
                        decalUV.Add(uv32);
                        decalUV.Add(uv31);

                        if (decalType.i_boneWeights)
                        {
                            decalBoneWeights.Add(boneWeight1);
                            decalBoneWeights.Add(boneWeight32);
                            decalBoneWeights.Add(boneWeight31);
                        }
                    }
                    else
                    {
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalTriangles.Add(decalTriangles.Count);
                        decalVertex.Add(vert3);
                        decalVertex.Add(vert31);
                        decalVertex.Add(vert32);
                        decalNormals.Add(norm3);
                        decalNormals.Add(norm31);
                        decalNormals.Add(norm32);
                        decalTangents.Add(tan3);
                        decalTangents.Add(tan31);
                        decalTangents.Add(tan32);
                        decalUV.Add(uv3);
                        decalUV.Add(uv31);
                        decalUV.Add(uv32);

                        if (decalType.i_boneWeights)
                        {
                            decalBoneWeights.Add(boneWeight3);
                            decalBoneWeights.Add(boneWeight31);
                            decalBoneWeights.Add(boneWeight32);
                        }
                    }
                }
                #endregion

                else
                {
                    Debug.Log("There are some unsorted triangles");
                }

            }
            ///Перегружаем в начальный массив
            triangles = decalTriangles;
            vertexes = decalVertex;
            tangents = decalTangents;
            normals = decalNormals;
            uv = decalUV;

            if (decalType.i_boneWeights)
            {
                boneWeights = decalBoneWeights;
            }
        }
        #endregion
        //Profiler.EndSample();

        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Profiler.BeginSample("MESHMODIFY");

        //COLOR TO TANGENTS///////////////////////////////////////////////////////////////////////////////////////////
        List<Color> color2tangents = new List<Color>();
        if (decalType.i_colors)
        {
            foreach (Vector4 tan in tangents)
            {
                Color col = PackColor(tan);
                color2tangents.Add(col);
            }
        }

        #region //UV////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        List<Vector2> UV2 = new List<Vector2>();
        if (decalType.i_uv2)
        {
            UV2.AddRange(uv);

            if (decalType.i_uv2GenerationMode == UVGenerationMode.Projective)
            {
                GenerateProjectiveUV(decalType, decalSize, Point, Tangent, Normal, Binormal, vertexes, UV2);
            }
            if (decalType.i_uv2GenerationMode == UVGenerationMode.Normalized)
            {
                GenerateNormalizedUV(UV2);
            }
        }
        //UV          
        if (decalType.i_uvGenerationMode == UVGenerationMode.Projective)
        {
            GenerateProjectiveUV(decalType, decalSize, Point, Tangent, Normal, Binormal, vertexes, uv);
            GenerateProjectiveTangents(tangents, normals, Binormal);
            //GenerateProjectiveTangents(triangles,tangents, normals, vertexes, uv);
        }
        if (decalType.i_uvGenerationMode == UVGenerationMode.Normalized)
        {
            GenerateNormalizedUV(uv);
        }
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        //Модифицируем UV
        //Масштаб
        if (decalType.i_uvScale != new Vector2(1, 1))
        {
            ScaleUV(decalType, uv, decalType.i_uvScale);
        }
        if (decalType.i_uvOffset != Vector2.zero)
        {
            OffsetUV(decalType, uv, decalType.i_uvOffset);
        }
        //Модифицируем UV2
        if (decalType.i_uv2)
        {
            //Масштаб
            if (decalType.i_uv2Scale != new Vector2(1, 1))
            {
                ScaleUV(decalType, UV2, decalType.i_uv2Scale);
            }
            if (decalType.i_uv2Offset != Vector2.zero)
            {
                OffsetUV(decalType, UV2, decalType.i_uv2Offset);
            }
        }

        //Случайные UV в плей моде
        if (Application.isPlaying && (decalType.i_atlasTilingU > 1 || decalType.i_atlasTilingV > 1))
        {
            RandomizeUV(decalType, uv,ref decalBasis);
        }
        #endregion

        //Смещение
        if (decalType.i_bitOffset > 0)
        {
            Offset(vertexes, normals, decalType.i_bitOffset);
        }
        // Profiler.EndSample();
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


        //Финальное наполнение массива
        Mesh decalMesh = new Mesh();
        decalMesh.vertices = vertexes.ToArray();
        decalMesh.normals = normals.ToArray();
        decalMesh.tangents = tangents.ToArray(); ;
        decalMesh.uv = uv.ToArray();

        if (decalType.i_uv2)
        {
            decalMesh.uv2 = UV2.ToArray();
        }
        else
        {
            decalMesh.uv2 = null;
        }

        if (decalType.i_boneWeights)
        {
            decalMesh.boneWeights = boneWeights.ToArray();
        }
        else
        {
            decalMesh.boneWeights = null;
        }

        if (decalType.i_colors)
        {
            decalMesh.colors = color2tangents.ToArray();
        }
        else
        {
            decalMesh.colors = null;
        }

        decalMesh.triangles = triangles.ToArray();

        if (!Application.isPlaying)
        {
            DestroyImmediate(cutedDecalMesh);
        }
        else
        {
            Destroy(cutedDecalMesh);
        }

        //Profiler.EndSample();

        return decalMesh;
    }
    // Object to World
    private static Mesh MeshObjectToWorldSpace(Mesh mesh, Transform transform)
    {
        if (!mesh)
            return null;

        //В мировое пространство
        Vector3[] vertexes = mesh.vertices;
        Vector3[] normals = mesh.normals;
        Vector4[] tangents = mesh.tangents;

        Color[] colors = null;
        if (mesh.colors.Length > 0)
            colors = mesh.colors;

        bool needcolors = (mesh.colors.Length > 0);

        Matrix4x4 vectorMatrix = transform.localToWorldMatrix.inverse.transpose;
        for (int i = 0; i < vertexes.Length; ++i)
        {
            vertexes[i] = transform.TransformPoint(vertexes[i]);
            normals[i] = vectorMatrix.MultiplyVector(normals[i]).normalized;
            float w = tangents[i].w;
            tangents[i] = vectorMatrix.MultiplyVector(tangents[i]).normalized;//Чтобы непотерять W
            tangents[i].w = w;

            //Тангенсы в цвете
            if (needcolors)
            {
                colors[i] = UnpackColor(colors[i]);
                w = colors[i].a;
                Vector4 v = colors[i];
                v = vectorMatrix.MultiplyVector(v).normalized;
                colors[i] = v;
                colors[i].a = w;
                colors[i] = PackColor(colors[i]);
            }
        }
        mesh.vertices = vertexes;
        mesh.normals = normals;
        mesh.tangents = tangents;
        mesh.colors = colors;

        return mesh;
    }
    // World to Object
    static public Mesh MeshWorldToObjectSpace(Mesh mesh, Transform transform)
    {
        if (!mesh)
            return null;

        Vector3[] vertexes = mesh.vertices;
        Vector3[] normals = mesh.normals;
        Vector4[] tangents = mesh.tangents;

        Color[] colors=null;
        if (mesh.colors.Length > 0)
            colors = mesh.colors;

        bool needcolors = (mesh.colors.Length > 0);

        Matrix4x4 vectorMatrix = transform.worldToLocalMatrix.inverse.transpose;
        for (int i = 0; i < vertexes.Length; ++i)
        {
            vertexes[i] = transform.InverseTransformPoint(vertexes[i]);
            normals[i] = vectorMatrix.MultiplyVector(normals[i]).normalized;
            float w = tangents[i].w;
            tangents[i] = vectorMatrix.MultiplyVector(tangents[i]).normalized;//Чтобы непотерять W
            tangents[i].w = w;

            //Тангенсы в цвете
            if (needcolors)
            {                     
                colors[i] = UnpackColor(colors[i]);
                w = colors[i].a;
                Vector4 v = colors[i];
                v = vectorMatrix.MultiplyVector(v).normalized;
                colors[i] = v;
                colors[i].a = w;
                colors[i] = PackColor(colors[i]);              
            }
        }
        mesh.vertices = vertexes;
        mesh.normals = normals;
        mesh.tangents = tangents;
        mesh.colors = colors;

        return mesh;
    }
    // Projective
    private static void GenerateProjectiveUV(DecalType decalType, Vector3 decalSize, Vector3 Point, Vector3 Tangent, Vector3 Normal,
    Vector3 Binormal, List<Vector3> vertexes, List<Vector2> uv)
    {
        //UV
        for (int i = 0; i < uv.Count; ++i)
        {
            float s = Vector3.Dot(-Tangent, vertexes[i] - Point) / decalSize.x + 0.5F;
            float t = Vector3.Dot(Binormal, vertexes[i] - Point) / decalSize.y + 0.5F;
            uv[i] = new Vector2(s, t);
        }
    }
    // Normalized
    private static void GenerateNormalizedUV(List<Vector2> uv)
    {
        if (uv.Count < 1)
            return;

        Vector2 leftBottom = uv[0];
        Vector2 rightTop = uv[0];

        //Получаем ректангл
        foreach (Vector2 vec in uv)
        {
            if (vec.x < leftBottom.x)
                leftBottom.x = vec.x;
            if (vec.y < leftBottom.y)
                leftBottom.y = vec.y;
            if (vec.x > rightTop.x)
                rightTop.x = vec.x;
            if (vec.y > rightTop.y)
                rightTop.y = vec.y;
        }

        Matrix4x4 uvMatrixTranslate = Matrix4x4.TRS(-new Vector3(leftBottom.x, leftBottom.y), Quaternion.identity, new Vector3(1, 1, 1));
        Matrix4x4 uvScale = Matrix4x4.Scale(new Vector3(1 / (rightTop.x - leftBottom.x), 1 / (rightTop.y - leftBottom.y), 1));
        Matrix4x4 uvMatrix = uvScale * uvMatrixTranslate;
        for (int i = 0; i < uv.Count; ++i)
        {
            uv[i] = uvMatrix.MultiplyPoint3x4(uv[i]);
        }
    }
    // Projective tan
    private static void GenerateProjectiveTangents(List<Vector4> tangents, List<Vector3> normals, Vector3 Binormal)
    {
        //Создаем UV тангенсы///////////////////////////////////////////////
        for (int i = 0; i < tangents.Count; ++i)
        {
            Vector3 t = Vector3.Cross(-Binormal, normals[i]).normalized;
            tangents[i] = new Vector4(t.x, t.y, t.z, -1);//ОЧЕНЬ ВАЖНЫЙ МОМЕНТ С БИНОРМАЛЬЮ
        }
    }
    // tan
    private static void GenerateProjectiveTangents(List<int> triangles,List<Vector4> tangents,List<Vector3> normals, List<Vector3> vertexes, List<Vector2> uv)
    {
        int triangleCount = triangles.Count;
        for (int i = 0; i < triangleCount; i += 3)
        {
            int index1 = triangles[i];
            int index2 = triangles[i+1];
            int index3 = triangles[i+2];

            Vector3 binormal;
            Vector3 tangent;
            float v1 = uv[index1].y;
            float v2 = uv[index2].y;
            float v3 = uv[index3].y;
            float u1 = uv[index1].x;
            float u2 = uv[index2].x;
            float u3 = uv[index3].x;
            Vector3 p1 = vertexes[index1];
            Vector3 p2 = vertexes[index2];
            Vector3 p3 = vertexes[index3];
            CalculateTangentBinormal(out tangent, out binormal, v1, v2, v3, u1, u2, u3, p1, p2, p3);

            //Vector3 normal1 = normals[index1];
            //Vector3 normal2 = normals[index2];
            //Vector3 normal3 = normals[index3];
            Vector3 tangent1 = tangent;
            Vector3 tangent2 = tangent;
            Vector3 tangent3 = tangent;
            //Vector3.OrthoNormalize(ref normal1, ref tangent1);
            //Vector3.OrthoNormalize(ref normal2, ref tangent2);
            //Vector3.OrthoNormalize(ref normal3, ref tangent3);

            tangents[index1] = tangent1;
            tangents[index2] = tangent2;
            tangents[index3] = tangent3;
        }
    }
    // Calc tan
    private static void CalculateTangentBinormal(out Vector3 tangent, out Vector3 binormal, float v1, float v2, float v3, float u1, float u2, float u3, Vector3 p1, Vector3 p2, Vector3 p3)
    {
        tangent = ((v3 - v1)*(p2 - p1) - (v2 - v1)*(p3 - p1))/((u2 - u1)*(v3 - v1) - (v2 - v1)*(u3 - u1));
        binormal = ((u3 - u1)*(p2 - p1) - (u2 - u1)*(p3 - p1))/((v2 - v1)*(u3 - u1) - (u2 - u1)*(v3 - v1));
    }
    // Scale UV
    private static void ScaleUV(DecalType decalType, List<Vector2> uv, Vector2 scale)
    {
        for (int i = 0; i < uv.Count; ++i)
        {
            uv[i] = Vector2.Scale(uv[i], scale);
        }
    }
    // UV offset
    private static void OffsetUV(DecalType decalType, List<Vector2> uv, Vector2 offset)
    {
        for (int i = 0; i < uv.Count; ++i)
        {
            uv[i] += offset;
        }
    }
    // offset
    private static void Offset(List<Vector3> vertexes, List<Vector3> normals, float offset)
    {
        for (int i = 0; i < vertexes.Count; ++i)
        {
            vertexes[i] = vertexes[i] + normals[i] * offset;
        }
    }
    // Simplify
    private static Mesh SimplifyMesh(Transform transform, Vector3 direction, DecalType decalType, Mesh colliderMesh)
    {
        //Profiler.BeginSample("SIMPLIFYMESH");
        if (!colliderMesh)
            return new Mesh();

        //Новый меш
        Mesh decalMesh = new Mesh();

        //Создаем массивы солладера
        int[] colliderTriangles = colliderMesh.triangles;
        Vector3[] colliderNormals = colliderMesh.normals;
        Vector3[] colliderVertex = colliderMesh.vertices;
        Vector2[] colliderUV = colliderMesh.uv;
        Vector4[] colliderTangents = colliderMesh.tangents;

        //Дополнительные
        BoneWeight[] colliderBoneWeights = new BoneWeight[colliderMesh.vertexCount];
        if (decalType.i_boneWeights)
        {
            colliderBoneWeights = colliderMesh.boneWeights;
        }

        //Создаем массивы для декали
        List<int> decalTriangles = new List<int>();
        List<Vector3> decalVertex = new List<Vector3>();
        List<Vector3> decalNormals = new List<Vector3>();
        List<Vector4> decalTangents = new List<Vector4>();
        List<Vector2> decalUV = new List<Vector2>();

        //Дополнительные
        //List<Color> decalColors = new List<Color>();
        List<BoneWeight> decalBoneWeights = new List<BoneWeight>();

        //Нормаль в пространство объекта
        Vector3 normal = direction;
        if (transform)
            normal = transform.InverseTransformDirection(direction);

        for (int indexT = 0; indexT < colliderTriangles.Length; indexT += 3)
        {
            for (int i = 0; i < 3; ++i)
            {
                int currentIndexT = indexT + i;//Берем каждый индекс из очередного треугольника
                float threshold = Mathf.Cos(decalType.i_normalThreshold * Mathf.Deg2Rad);//Конвертируем из градусов в дот
                if (Vector3.Dot(normal, colliderNormals[colliderTriangles[currentIndexT]]) > threshold)
                {
                    for (int index = 0; index < 3; ++index)
                    {
                        //Собираем в листы новые индексы вертексы и т.д.
                        int triangleIndex = colliderTriangles[indexT + index];
                        decalTriangles.Add(decalTriangles.Count);
                        decalVertex.Add(colliderVertex[triangleIndex]);
                        decalTangents.Add(colliderTangents[triangleIndex]);
                        decalNormals.Add(colliderNormals[triangleIndex]);
                        decalUV.Add(colliderUV[triangleIndex]);

                        //Дополнительные
                        if (decalType.i_boneWeights)
                        {
                            if (colliderBoneWeights.Length > 0)
                                decalBoneWeights.Add(colliderBoneWeights[triangleIndex]);
                            else
                                decalBoneWeights.Add(new BoneWeight());
                        }
                    }
                    break;
                }
            }
        }
        //Заполняем массив меша
        decalMesh.vertices = decalVertex.ToArray();
        decalMesh.normals = decalNormals.ToArray();
        decalMesh.tangents = decalTangents.ToArray();
        decalMesh.uv = decalUV.ToArray();

        //Дополнительные
        if (decalType.i_boneWeights)
        {
            decalMesh.boneWeights = decalBoneWeights.ToArray();
        }

        decalMesh.triangles = decalTriangles.ToArray();

        if (!Application.isPlaying)
        {
            DestroyImmediate(colliderMesh);
        }
        else
        {
            Destroy(colliderMesh);
        }

        //Profiler.EndSample();
        return decalMesh;
    }
    // UV atlas correct
    private static void RandomizeUV(DecalType decalType, List<Vector2> uv,ref DecalBasis basis)
    {
        int sOffset = (int)UnityEngine.Random.Range(0, decalType.i_atlasTilingU);
        int tOffset = (int)UnityEngine.Random.Range(0, decalType.i_atlasTilingV);
        float sScaleFactor = (float)(1.0 / decalType.i_atlasTilingU);
        float tScaleFactor = (float)(1.0 / decalType.i_atlasTilingV);

        for (int i = 0; i < uv.Count; ++i)
        {
            Vector2 v = uv[i];
            v.x *= sScaleFactor;
            v.y *= tScaleFactor;
            uv[i] = v;
            //Случайно смещаем
            uv[i] += new Vector2(sScaleFactor * sOffset, tScaleFactor * tOffset);
        }

        basis.UVParams=new Vector4(sScaleFactor,tScaleFactor,sOffset,tOffset);
    }
    // basis debug
    private static IEnumerator BasisDebug(Vector3 point, Vector3 normal, Vector3 tangent, Vector3 binormal)
    {
        while (true)
        {
            Debug.DrawLine(point, point + normal, Color.blue);
            Debug.DrawLine(point, point + tangent, Color.green);
            Debug.DrawLine(point, point + binormal, Color.red);
            yield return null;
        }
    }
    // Bone Weight
    private static BoneWeight BoneWeightLerp(BoneWeight boneWeight1, BoneWeight boneWeight2, float lerp)
    {
        BoneWeight lerpBoneWeight = new BoneWeight();
        if (lerp < 0.5)
            lerpBoneWeight = boneWeight1;
        else
            lerpBoneWeight = boneWeight2;

        return lerpBoneWeight;
    }
    // Create full skinned mesh
    private static Mesh GetFullSkinnedMesh(SkinnedMeshRenderer smr, DecalType decalType)
    {
        //Profiler.BeginSample("GETFULLSKINNEDMESH");

        //Делаем копию
        Mesh fullSkinnedMesh = Instantiate(smr.sharedMesh) as Mesh;

        Vector3[] vertexes = smr.sharedMesh.vertices;
        Vector3[] normals = smr.sharedMesh.normals;
        Vector4[] tangents = smr.sharedMesh.tangents;
        BoneWeight[] boneWeights = smr.sharedMesh.boneWeights;

        //Кости
        Transform[] bones = smr.bones;
        Matrix4x4[] bindposes = smr.sharedMesh.bindposes;

        Profiler.BeginSample("BUILD SKIN MATRIX ARRAY");
        //Основная матрица
        Matrix4x4[] skinToWorldMatrix = new Matrix4x4[bones.Length];
        for (int i = 0; i < skinToWorldMatrix.Length; ++i)
        {
            skinToWorldMatrix[i] = bones[i].localToWorldMatrix * bindposes[i];
        }
        //Profiler.EndSample();

        //Profiler.BeginSample("MATRIXSKINNING");
        //По всем вертексам
        int length = vertexes.Length;
        for (int i = 0; i < length; ++i)
        {
            BoneWeight bw = boneWeights[i];
            Matrix4x4 skinnedMatrix = new Matrix4x4();
            for (int j = 0; j < 16; ++j)
            {
                if (decalType.i_decalBoneWeightQuality == DecalBoneWeightQuality.Bone_1)
                {
                    skinnedMatrix[j] = skinToWorldMatrix[bw.boneIndex0][j];
                }
                else if (decalType.i_decalBoneWeightQuality == DecalBoneWeightQuality.Bone_2)
                {
                    float k = bw.weight0 + bw.weight1;
                    skinnedMatrix[j] = skinToWorldMatrix[bw.boneIndex0][j] * bw.weight0 / k +
                    skinToWorldMatrix[bw.boneIndex1][j] * bw.weight1 / k;
                }
                else
                {
                    skinnedMatrix[j] = skinToWorldMatrix[bw.boneIndex0][j] * bw.weight0 +
                    skinToWorldMatrix[bw.boneIndex1][j] * bw.weight1 +
                    skinToWorldMatrix[bw.boneIndex2][j] * bw.weight2 +
                    skinToWorldMatrix[bw.boneIndex3][j] * bw.weight3;
                }
            }

            float w = tangents[i].w;
            vertexes[i] = skinnedMatrix.MultiplyPoint3x4(vertexes[i]);
            normals[i] = skinnedMatrix.MultiplyVector(normals[i]);
            tangents[i] = skinnedMatrix.MultiplyVector(tangents[i]);
            tangents[i].w = w;
            normals[i].Normalize();
            tangents[i].Normalize();
        }
        //Profiler.EndSample();

        fullSkinnedMesh.vertices = vertexes;
        fullSkinnedMesh.normals = normals;
        fullSkinnedMesh.tangents = tangents;

        //Profiler.EndSample();

        return fullSkinnedMesh;
    }
    // Decal to bind
    private static Mesh SkinnedDecalMeshToBindPose(Mesh decalMesh, SkinnedMeshRenderer smr, DecalType decalType)
    {
        //Profiler.BeginSample("MESHTOBINDPOSE");
        Vector3[] vertexes = decalMesh.vertices;
        Vector3[] normals = decalMesh.normals;
        Vector4[] tangents = decalMesh.tangents;
        BoneWeight[] boneWeights = decalMesh.boneWeights;

        Color[] colors = null;
        if (decalType.i_colors)
            colors = decalMesh.colors;

        if (boneWeights.Length == 0)
        {
            throw new MissingReferenceException("BoneWeight array is empty, check BoneWeight component generation");
        }

        //Кости
        Transform[] bones = smr.bones;
        Matrix4x4[] bindposes = smr.sharedMesh.bindposes;

        //Основная матрица
        Matrix4x4[] skinToWorldMatrix = new Matrix4x4[bones.Length];
        for (int i = 0; i < skinToWorldMatrix.Length; ++i)
        {
            skinToWorldMatrix[i] = bones[i].localToWorldMatrix * bindposes[i];
        }

        //По всем вертексам
        for (int i = 0; i < vertexes.Length; ++i)
        {
            BoneWeight bw = boneWeights[i];
            Matrix4x4 skinnedMatrix = new Matrix4x4();
            for (int j = 0; j < 16; ++j)
            {
                if (decalType.i_decalBoneWeightQuality == DecalBoneWeightQuality.Bone_1)
                {
                    skinnedMatrix[j] = skinToWorldMatrix[bw.boneIndex0][j];
                }
                else if (decalType.i_decalBoneWeightQuality == DecalBoneWeightQuality.Bone_2)
                {
                    float k = bw.weight0 + bw.weight1;
                    skinnedMatrix[j] = skinToWorldMatrix[bw.boneIndex0][j] * bw.weight0 / k +
                    skinToWorldMatrix[bw.boneIndex1][j] * bw.weight1 / k;
                }
                else
                {
                    skinnedMatrix[j] = skinToWorldMatrix[bw.boneIndex0][j] * bw.weight0 +
                    skinToWorldMatrix[bw.boneIndex1][j] * bw.weight1 +
                    skinToWorldMatrix[bw.boneIndex2][j] * bw.weight2 +
                    skinToWorldMatrix[bw.boneIndex3][j] * bw.weight3;
                }
            }

            //Обратная матрица
            float w = tangents[i].w;
            Matrix4x4 inverse = skinnedMatrix.inverse;
            vertexes[i] = inverse.MultiplyPoint3x4(vertexes[i]);
            normals[i] = inverse.MultiplyVector(normals[i]);
            tangents[i] = inverse.MultiplyVector(tangents[i]);
            tangents[i].w = w;
            normals[i].Normalize();
            tangents[i].Normalize();
          
            //Тангенсы в цвете
            if (decalType.i_colors)
            {
                colors[i] = UnpackColor(colors[i]);
                w = colors[i].a;
                Vector4 v = colors[i];
                v = inverse.MultiplyVector(v).normalized;
                colors[i] = v;
                colors[i].a = w;
                colors[i] = PackColor(colors[i]);
            }
        }

        decalMesh.vertices = vertexes;
        decalMesh.normals = normals;
        decalMesh.tangents = tangents;
        decalMesh.colors = colors;

        //Profiler.EndSample();

        return decalMesh;
    }
    // Pack colors (0-1)
    private static Color PackColor(Color color)
    {
       return new Color(color.r*0.5F+0.5F,color.g*0.5F+0.5F,color.b*0.5F+0.5F,color.a*0.5F+0.5F);
    }
    // Unpack colors (-1-1)
    private static Color UnpackColor(Color color)
    {
        return new Color(color.r * 2 - 1, color.g * 2 - 1, color.b * 2 - 1, color.a * 2 - 1);
    }
}
public class MeshSubmeshTriangles
{
    private Mesh mesh;//Текущий меш
    public Mesh Mesh
    {
        get { return mesh; }
        set { mesh = value; }
    }
    private List<int> submeshIndexes = new List<int>();//Индексы
    public List<int> SubmeshIndexes
    {
        get { return submeshIndexes; }
        set { submeshIndexes = value; }
    }
    private List<int[]> triangles = new List<int[]>();//Трианглы
    public List<int[]> Triangles
    {
        get { return triangles; }
        set { triangles = value; }
    }
}
public struct DecalBasis
{
    private Vector3 _tangent;
    public Vector3 Tangent
    {
        get { return _tangent; }
        set { _tangent = (Vector3)value.normalized; }
    }
    private Vector3 _binormal;
    public Vector3 Binormal
    {
        get { return _binormal; }
        set { _binormal = (Vector3)value.normalized; }
    }
    private Vector3 _normal;
    public Vector3 Normal
    {
        get { return _normal; }
        set { _normal = (Vector3)value.normalized; }
    }
    private Vector4 _uvParams;
    public Vector4 UVParams
    {
        get
        {
            if (_uvParams == new Vector4(0, 0, 0, 0))
                return new Vector4(1, 1, 0, 0);
            else
                return _uvParams;
        }
        set { _uvParams = value; }
    }
    private Vector3 _rand;
    public Vector3 Rand
    {
        get { return _rand; }
        set { _rand = value; }
    }
}